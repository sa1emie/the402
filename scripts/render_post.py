#!/usr/bin/env python3
"""Render docs/mcp-measurement-post.md into an embeddable HTML string.

Deliberately small: it only handles the constructs this post uses. It exists so
the page and the markdown cannot disagree about a number, and so the rendering
rules live in one place instead of being retyped each time.

Usage: python3 scripts/render_post.py
"""
import json
import re

SRC = "docs/mcp-measurement-post.md"
OUT = "directory/src/post-mcp.ts"


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def inline(s):
    s = esc(s)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', s)
    return s


def render(md):
    out, lines, i = [], md.split("\n"), 0
    while i < len(lines):
        ln = lines[i]

        if ln.startswith("```"):
            blk = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                blk.append(lines[i]); i += 1
            out.append('<div class="scroll"><pre class="mono">%s</pre></div>' % esc("\n".join(blk)))

        elif ln.startswith("|") and i + 1 < len(lines) and set(lines[i + 1].replace("|", "").strip()) <= set("-: "):
            head = [c.strip() for c in ln.strip("|").split("|")]
            i += 2
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip("|").split("|")]); i += 1
            i -= 1
            out.append('<div class="scroll"><table><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (
                "".join("<th>%s</th>" % inline(h) for h in head),
                "".join("<tr>%s</tr>" % "".join("<td>%s</td>" % inline(c) for c in r) for r in rows)))

        elif ln.startswith("## "):
            out.append("<h2>%s</h2>" % inline(ln[3:]))
        elif ln.startswith("# "):
            out.append("<h1>%s</h1>" % inline(ln[2:]))

        # An emphasised standfirst. The opening line starts with a single "*"
        # and the closing "*" can be several lines later, which an earlier
        # version missed: it required both on the same line, so the asterisks
        # rendered literally at the top of the published post.
        elif ln.startswith("*") and not ln.startswith("**") and len(ln) > 1:
            para = [ln]
            while i < len(lines) and not lines[i].rstrip().endswith("*"):
                i += 1
                if i < len(lines):
                    para.append(lines[i])
            text = " ".join(para).strip()
            if text.startswith("*"):
                text = text[1:]
            if text.endswith("*"):
                text = text[:-1]
            out.append('<p class="lede"><em>%s</em></p>' % inline(text.strip()))

        elif ln.strip():
            para = [ln]
            i += 1
            while i < len(lines) and lines[i].strip() and not lines[i].startswith(("#", "|", "`", "*")):
                para.append(lines[i]); i += 1
            i -= 1
            out.append("<p>%s</p>" % inline(" ".join(para)))
        i += 1
    return "\n".join(out)


def main():
    html = render(open(SRC, encoding="utf-8").read())
    assert "*Measured" not in html, "stray asterisk survived the lede"
    assert "<h1>" in html and "<table>" in html, "post lost its structure"
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("// Generated from %s by scripts/render_post.py. Do not edit here.\n"
                "// Edit the markdown and regenerate, so the page and the repo never\n"
                "// disagree about a number.\n"
                "export const MCP_POST_HTML = %s;\n" % (SRC, json.dumps(html)))
    print("rendered %d bytes | h1 %d | h2 %d | tables %d | lede %d"
          % (len(html), html.count("<h1>"), html.count("<h2>"),
             html.count("<table>"), html.count('class="lede"')))


if __name__ == "__main__":
    main()
