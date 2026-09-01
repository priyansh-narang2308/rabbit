export interface ParsedEvent {
  timestamp: number;
  type: "navigation" | "click" | "input" | "scroll" | "snapshot" | "unknown";
  data?: any;
}

export class ReplayParser {
  static parse(events: any[]): ParsedEvent[] {
    const parsed: ParsedEvent[] = [];

    for (const event of events) {
      const type = event.type;
      const timestamp = event.timestamp;

      if (type === 4) {
        parsed.push({
          timestamp,
          type: "navigation",
          data: { href: event.data?.href },
        });
      } else if (type === 2) {
        parsed.push({
          timestamp,
          type: "snapshot",
          data: { nodeCount: event.data?.node?.childNodes?.length || 0 },
        });
      } else if (type === 3) {
        const source = event.data?.source;
        if (source === 2) {
          const action = event.data.type;
          // 2 = Click
          if (action === 2) {
            parsed.push({
              timestamp,
              type: "click",
              data: { id: event.data.id, x: event.data.x, y: event.data.y },
            });
          }
        }
        // 3 = Scroll
        else if (source === 3) {
          parsed.push({
            timestamp,
            type: "scroll",
            data: { id: event.data.id, x: event.data.x, y: event.data.y },
          });
        }
        // 5 = Input
        else if (source === 5) {
          parsed.push({
            timestamp,
            type: "input",
            data: { id: event.data.id, text: event.data.text },
          });
        }
      }
    }

    return parsed;
  }
}
