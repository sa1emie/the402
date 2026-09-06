# Hacker News submission

## Do not post tonight

It is Saturday night. Hacker News on a weekend evening is the worst slot there
is: low traffic, low voting, and a post that dies on page 3 cannot be
resubmitted with the same link. **Post Tuesday or Wednesday, between 8 and
10am US eastern.** That is worth more than anything in the copy below.

## Link

https://the402.dev/posts/mcp-registry-measurement

Not "Show HN". Show HN is for a thing you built and want tried. This is a
measurement, and the finding is more interesting than the directory. A ninth
directory is not news. A number nobody has published is.

## Title

Recommended:

    We called 9,109 MCP servers. 30% are locked, which is not the same as broken.

75 characters. It states a checkable fact, and the second clause is the actual
insight rather than a tease. HN rewards a specific claim it can argue with.

Alternatives, in order:

    45% of listed MCP servers answer a handshake. 30% are gated, not dead.
    One initialize handshake to every remote server in the MCP registry

Avoid anything shaped like "What I learned from" or "The surprising truth
about". Those read as content marketing and get flagged.

## First comment, post it yourself immediately after submitting

This is the highest-leverage part of an HN submission and most people skip it.

> Author here. Method, since that is the part worth arguing with.
>
> I pulled every server from registry.modelcontextprotocol.io, took the 9,109
> that expose a remote HTTP endpoint, and sent each one a single JSON-RPC
> initialize. On success I followed with tools/list. No auth, no tool calls,
> one request per server.
>
> The thing I got wrong first: I sampled 400 servers three weeks ago and got
> 45.8% gated, 12.7% failing. The full run says 30.3% and 24.9%. My sample was
> the first 400 entries in the registry's default order, and that order is not
> random. The post has the retraction in it.
>
> Two caveats I would raise if I were reading this. I did not retry timeouts,
> so some of the 833 unreachable were probably just unlucky. And three hosts
> distort the failure rate badly: one has 276 dead listings, a trycloudflare
> tunnel has 90, and Smithery proxies account for 189. Counted per host rather
> than per listing, failures drop from 24.9% to 17.6%. Both numbers are in the
> post because I could not decide which was more honest.
>
> Happy to run the probe against any server if someone wants a specific one
> checked.

Why this works: it hands critics the two strongest attacks before they find
them, and it admits an error. On HN that buys more credibility than any claim.

## If it does well

Expect the first serious comment to be someone arguing that a 401 means the
server is working fine and should not be in a "did not answer" bucket at all.
That person is right and the post already agrees with them. Say so.

Expect someone to ask why we did not authenticate. The answer is that we do
not hold credentials for other people's servers and would not use them if we
did.

Do not argue about whether the directory is useful. That is not the post.

## X thread, post after HN, not before

1/ I sent one MCP `initialize` handshake to all 9,109 remote servers in the
official registry.

45% answered.
30% returned a 401 or 403.
25% failed outright.

The middle number is the interesting one.

2/ A server that answers 401 is running. It wants a credential I do not have.

A checker that sends one request and treats "no result" as "dead" calls every
one of those broken. That is 2,762 servers it is wrong about.

3/ Three hosts wreck the failure rate. One has 276 dead listings. A
trycloudflare tunnel has 90. Smithery proxies another 189.

Per listing, 24.9% fail. Per host, 17.6%. Both are in the post because I could
not pick one.

4/ I got this wrong before I got it right. A 400-server sample said 45.8%
gated. The full run says 30.3%.

The sample was the first 400 entries in the registry's default order. That is
not a sample, that is the top of a list.

5/ Four companies with live MCP servers are not in the official registry at
all: Firecrawl, Tavily, Browserbase, Nansen. All four answer a handshake. I
only found them because I went looking.

6/ Full method, the numbers both ways, and what I did not do:
https://the402.dev/posts/mcp-registry-measurement

Directory of all 9,109 results: https://the402.dev/mcp

## Reddit

r/mcp and r/LocalLLaMA are plausible. Read each rule set on self promotion
first and skip any where it is borderline. This channel is optional and the
least valuable of the three.
