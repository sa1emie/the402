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

    We called 16,923 MCP servers. A quarter are locked, which is not the same as broken.

75 characters. It states a checkable fact, and the second clause is the actual
insight rather than a tease. HN rewards a specific claim it can argue with.

Alternatives, in order:

    Half of listed MCP servers answer a handshake. A quarter are gated, not dead.
    One initialize handshake to every remote server in the MCP registry

Avoid anything shaped like "What I learned from" or "The surprising truth
about". Those read as content marketing and get flagged.

## First comment, post it yourself immediately after submitting

This is the highest-leverage part of an HN submission and most people skip it.

> Author here. Method, since that is the part worth arguing with.
>
> I walked all 930 pages of registry.modelcontextprotocol.io: 92,908 entries,
> 27,422 unique server names, 16,923 unique remote endpoints. Each got one
> JSON-RPC initialize, then tools/list on success. No auth, no tool calls, one
> request per endpoint.
>
> I got this wrong twice before getting it right, and both are in the post.
> First I sampled 400 servers, which was just the top of the list. Then I ran
> what I thought was the full crawl, except my harvester had a 400 page limit
> against a 930 page registry. It stopped at 54%, returned no error, and I
> published 45% answering and 30% gated off the back of it. The real numbers
> are 51% and 24%. I had already emailed three companies the wrong figures and
> had to write to all of them.
>
> Two caveats I would raise if I were reading this. I did not retry timeouts,
> so some of the 1,802 unreachable were probably just unlucky. And a few hosts
> carry huge listing counts, gateway.pipeworx.io alone has 1,314, so per host
> the failure rate is 20.0% against 24.9% per listing. Both are in the post
> because I could not decide which was more honest.
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

1/ I sent one MCP `initialize` handshake to all 16,923 remote endpoints in the
official registry. All 930 pages of it.

51% answered.
24% returned a 401 or 403.
25% failed outright.

The middle number is the interesting one.

2/ A server that answers 401 is running. It wants a credential I do not have.

A checker that sends one request and treats "no result" as "dead" calls every
one of those broken. That is 4,068 endpoints it is wrong about.

3/ A few hosts carry enormous listing counts. gateway.pipeworx.io has 1,314.
api.mcp.ai has 1,115.

Per listing, 24.9% fail. Per host, 20.0%. Both are in the post because I could
not pick one.

4/ I got this wrong twice. First a 400-server sample, which was the top of a
list, not a sample.

Then my harvester had a 400 page cap against a 930 page registry. It stopped at
54% and reported no error. I published those numbers. They were wrong.

5/ Four companies with live MCP servers are not in the official registry at
all: Firecrawl, Tavily, Browserbase, Nansen. All four answer a handshake. I
only found them because I went looking.

6/ Full method, the numbers both ways, and what I did not do:
https://the402.dev/posts/mcp-registry-measurement

Directory of all 16,923 results: https://the402.dev/mcp

## Reddit

r/mcp and r/LocalLLaMA are plausible. Read each rule set on self promotion
first and skip any where it is borderline. This channel is optional and the
least valuable of the three.
