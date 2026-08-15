#!/usr/bin/env python3
"""Send work to non-Anthropic models for independent review.

Why this exists: the most useful audit this project received came from a
different model family. Same-family reviewers share blind spots. DeepSeek
caught things Claude had re-read several times without noticing.

Two providers, routed by what each is better at rather than at random:

  deepseek  analytical passes. Number consistency, code correctness, spec
            compliance. Things with a right answer.
  kimi      judgement passes. Positioning, strategy, hostile-reader copy
            critique. Things with an argument.

Both speak the OpenAI chat-completions shape, so one client covers both.

Usage:
    export DEEPSEEK_API_KEY=...
    export MOONSHOT_API_KEY=...

    python3 scripts/external_review.py --list-models          # discover real model ids
    python3 scripts/external_review.py --preset numbers       # routes to deepseek
    python3 scripts/external_review.py --preset strategy      # routes to kimi
    python3 scripts/external_review.py --panel                # every preset, both models
    python3 scripts/external_review.py --files docs/x.md --prompt "..." --provider kimi

Reviews land in docs/external-review-<preset>-<provider>-<date>.md.
Standard library only, Python 3.9 compatible.
"""

import argparse
import concurrent.futures
import datetime
import json
import os
import sys
import time
import urllib.request

# Verified against both providers' /models endpoints on 2026-08-15.
# Re-run --list-models if a call starts failing on an unknown model id.
PROVIDERS = {
    "deepseek": {
        "base": "https://api.deepseek.com",
        "default_model": "deepseek-v4-pro",
        "env": ["DEEPSEEK_API_KEY"],
        "good_at": "analysis with a right answer",
    },
    "kimi": {
        "base": "https://api.moonshot.ai/v1",
        "default_model": "kimi-k3",
        "env": ["MOONSHOT_API_KEY", "KIMI_API_KEY"],
        "good_at": "judgement calls and argument",
        # kimi-k3 rejects any temperature other than 1 with a 400. Sending the
        # usual 0.3 fails every call, which looks like a rate limit until you
        # read the error body.
        "temperature": 1,
        # kimi-k3 reasons for a long time on big prompts. 300s was not enough
        # and surfaced as an opaque read timeout after four retries.
        "timeout": 900,
    },
}

SYSTEM = (
    "You are auditing work produced by another AI. Be adversarial and specific. "
    "The author re-read this several times without spotting its problems, so "
    "assume the obvious errors are gone and the remaining ones are subtle. "
    "Quote the exact line you object to. If something is genuinely fine, say so "
    "plainly rather than inventing a criticism to look useful. A short review "
    "that finds two real problems beats a long one that pads. Never use em dashes."
)

# Each preset names the provider whose strength fits the question.
PRESETS = {
    "numbers": {
        "provider": "deepseek",
        "files": ["docs/measurement-post.md", "docs/launch-copy.md", "docs/gtm-plan.md", "README.md"],
        "prompt": (
            "Every number in these files should be identical across all of them and "
            "arithmetically consistent. Find any figure contradicting another, any "
            "percentage that does not match its stated numerator and denominator, and "
            "any claim presented as measured that is actually inferred. Live data: "
            "https://the402.dev/api/stats. List each problem with file and line."
        ),
    },
    "code": {
        "provider": "deepseek",
        "files": ["api/src/x402.ts", "api/src/index.ts"],
        "prompt": (
            "This code probes arbitrary URLs and decides whether each is a payable "
            "x402 endpoint. A wrong verdict gets published about someone else's "
            "service, so false confidence is the worst failure mode. Find cases where "
            "it reports a wrong verdict, mishandles a spec edge case, or can be abused "
            "by a hostile URL. Ignore style."
        ),
    },
    "strategy": {
        "provider": "kimi",
        "files": ["docs/gtm-plan.md", "README.md"],
        "prompt": (
            "Critique the strategy, not the writing. The core bet is that measuring "
            "the network honestly beats listing it, in a market where eight "
            "directories already exist including the protocol owner's own. "
            "Attack that bet. What is the strongest argument it fails? What is the "
            "most likely way this is irrelevant in three months? What would a "
            "competitor do to make this worthless in a week? If the bet is sound, "
            "say which part is load-bearing and what would break it."
        ),
    },
    "copy": {
        "provider": "kimi",
        "files": ["docs/measurement-post.md", "docs/launch-copy.md"],
        "prompt": (
            "Read as a hostile technical reader on Hacker News who thinks developer "
            "marketing is usually dishonest. Where would you accuse this of "
            "overstating? What claim would you demand proof of? Which exact sentence "
            "makes you stop reading? Quote the text. Then name the single edit that "
            "would most improve its credibility."
        ),
    },
    "redteam": {
        "provider": "kimi",
        "files": ["docs/gtm-plan.md", "docs/measurement-post.md", "docs/audit-report.md"],
        "prompt": (
            "Kill this project. You are an investor who thinks it is a waste of time. "
            "Make the strongest case that it should not launch: the market is too "
            "small, the moat does not exist, the differentiator is trivially copied, "
            "the effort is misallocated. Be specific and use their own numbers "
            "against them. Then, only if you can, name the one thing that would "
            "change your mind."
        ),
    },
}


def key_for(provider):
    spec = PROVIDERS[provider]
    return next((os.environ[n] for n in spec["env"] if os.environ.get(n)), None)


def post(url, api_key, payload, timeout=900, attempts=4):
    """POST with backoff on rate limits.

    Firing several requests at one provider concurrently earns a 429. Retry
    with widening gaps rather than losing the review.
    """
    last = None
    for i in range(attempts):
        try:
            request = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json", "Authorization": "Bearer %s" % api_key},
            )
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return json.load(response)
        except urllib.error.HTTPError as err:
            # Read the body. Providers explain themselves there, and without it
            # a 400 reads as a generic "Bad Request" that looks like a rate
            # limit. One such 400 was only "invalid temperature for this model".
            try:
                detail = err.read().decode("utf-8", "replace")[:300]
            except Exception:
                detail = ""
            last = RuntimeError("HTTP %s: %s" % (err.code, detail or err.reason))
            if err.code in (429, 500, 502, 503, 529) and i < attempts - 1:
                time.sleep(8 * (i + 1))
                continue
            raise last
        except Exception as err:
            last = err
            if i < attempts - 1:
                time.sleep(4 * (i + 1))
                continue
            raise
    raise last


def list_models():
    """Ask each provider what it actually offers. Model ids drift."""
    for name, spec in sorted(PROVIDERS.items()):
        api_key = key_for(name)
        if not api_key:
            print("  %-9s no key set (%s)" % (name, " or ".join(spec["env"])))
            continue
        try:
            request = urllib.request.Request(
                "%s/models" % spec["base"],
                headers={"Authorization": "Bearer %s" % api_key},
            )
            with urllib.request.urlopen(request, timeout=60) as response:
                body = json.load(response)
            ids = sorted(m.get("id", "?") for m in body.get("data", []))
            print("  %-9s %s" % (name, ", ".join(ids) or "(none returned)"))
        except Exception as err:
            print("  %-9s query failed: %s" % (name, str(err)[:90]))


def read_files(paths):
    chunks = []
    for path in paths:
        if not os.path.exists(path):
            print("  skipping missing file: %s" % path, file=sys.stderr)
            continue
        with open(path, "r", encoding="utf-8") as handle:
            chunks.append("===== %s =====\n%s" % (path, handle.read()))
    return "\n\n".join(chunks)


def review(preset_name, provider, model, files, prompt):
    api_key = key_for(provider)
    if not api_key:
        return preset_name, provider, None, "no key set for %s" % provider
    content = read_files(files)
    if not content:
        return preset_name, provider, None, "no readable files"
    spec = PROVIDERS[provider]
    try:
        body = post(
            "%s/chat/completions" % spec["base"],
            api_key,
            {
                "model": model or spec["default_model"],
                "messages": [
                    {"role": "system", "content": SYSTEM},
                    {"role": "user", "content": "%s\n\n%s" % (prompt, content)},
                ],
                "temperature": spec.get("temperature", 0.3),
                "stream": False,
            },
            timeout=spec.get("timeout", 300),
        )
        return preset_name, provider, body["choices"][0]["message"]["content"], None
    except Exception as err:
        return preset_name, provider, None, str(err)[:200]


def write_review(preset_name, provider, model, files, text):
    today = datetime.date.today().isoformat()
    path = "docs/external-review-%s-%s-%s.md" % (preset_name, provider, today)
    header = (
        "# External review: %s (%s, %s)\n\n"
        "Date: %s. Files: %s.\n\n"
        "One model's opinion, not a verdict. Verify anything it claims before "
        "acting. The last external audit's headline finding turned out to be "
        "wrong, so treat this as a lead to check, not a conclusion.\n\n---\n\n"
        % (preset_name, provider, model or PROVIDERS[provider]["default_model"],
           today, ", ".join(files))
    )
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(header + text + "\n")
    return path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--preset", choices=sorted(PRESETS))
    parser.add_argument("--panel", action="store_true", help="run every preset on its routed provider")
    parser.add_argument("--list-models", action="store_true", help="ask each provider what it offers")
    parser.add_argument("--provider", choices=sorted(PROVIDERS), help="override the preset's routing")
    parser.add_argument("--model", help="override the model id")
    parser.add_argument("--files", nargs="*")
    parser.add_argument("--prompt")
    args = parser.parse_args()

    if args.list_models:
        print("available models per provider:")
        list_models()
        return 0

    jobs = []
    if args.panel:
        for name, cfg in sorted(PRESETS.items()):
            jobs.append((name, args.provider or cfg["provider"], cfg["files"], cfg["prompt"]))
    elif args.preset:
        cfg = PRESETS[args.preset]
        jobs.append((args.preset, args.provider or cfg["provider"],
                     args.files or cfg["files"], args.prompt or cfg["prompt"]))
    elif args.files and args.prompt:
        jobs.append(("adhoc", args.provider or "deepseek", args.files, args.prompt))
    else:
        print("Give --preset NAME, --panel, --list-models, or both --files and --prompt.", file=sys.stderr)
        print("Presets: %s" % ", ".join("%s (%s)" % (n, c["provider"]) for n, c in sorted(PRESETS.items())),
              file=sys.stderr)
        return 2

    missing = {p for _, p, _, _ in jobs if not key_for(p)}
    if missing:
        for provider in sorted(missing):
            print("No key for %s. Set one of: %s"
                  % (provider, ", ".join(PROVIDERS[provider]["env"])), file=sys.stderr)
        if len(missing) == len({p for _, p, _, _ in jobs}):
            return 2

    # Providers run in parallel with each other, but each provider's own jobs
    # run one at a time. Three concurrent calls to one provider is what earned
    # the 429 that lost three reviews.
    by_provider = {}
    for name, provider, files, prompt in jobs:
        by_provider.setdefault(provider, []).append((name, files, prompt))

    print("running %d review(s) across %d provider(s), serial within each..."
          % (len(jobs), len(by_provider)), file=sys.stderr)
    written, failed = [], []

    def run_provider(provider, items):
        results = []
        for name, files, prompt in items:
            results.append(review(name, provider, args.model, files, prompt))
        return results

    with concurrent.futures.ThreadPoolExecutor(max_workers=len(by_provider)) as pool:
        futures = [pool.submit(run_provider, p, items) for p, items in by_provider.items()]
        for future in concurrent.futures.as_completed(futures):
            for name, provider, text, err in future.result():
                if err:
                    failed.append((name, provider, err))
                    print("  %-9s %-9s FAILED: %s" % (name, provider, err), file=sys.stderr)
                    continue
                files = next(f for n, p, f, _ in jobs if n == name)
                path = write_review(name, provider, args.model, files, text)
                written.append(path)
                print("  %-9s %-9s -> %s" % (name, provider, path), file=sys.stderr)

    if written:
        print("\nwrote %d review(s). Read them, verify the claims, then act." % len(written), file=sys.stderr)
    return 1 if failed and not written else 0


if __name__ == "__main__":
    sys.exit(main())
