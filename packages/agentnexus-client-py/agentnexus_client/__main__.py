"""Command line: python -m agentnexus_client "send an email" """

import json
import sys

from . import AgentNexus, AgentNexusError


def main() -> int:
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print('usage: agentnexus "<need>"  |  agentnexus card <slug>  |  agentnexus key')
        return 0
    nexus = AgentNexus()
    try:
        if args[0] == "card" and len(args) > 1:
            out = nexus.health_card(args[1])
        elif args[0] == "key":
            out = {"api_key": AgentNexus.create_key()}
        else:
            out = nexus.discover(" ".join(args))
    except AgentNexusError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
