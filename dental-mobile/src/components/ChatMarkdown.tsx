import React from 'react';
import { View, Text, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

interface ChatMarkdownProps {
  content: string;
  textStyle?: TextStyle;
  /** User bubble (white text) */
  inverted?: boolean;
}

const BULLET_RE = /^\s*[-*•]\s+/;
const NUMBERED_RE = /^\s*\d+[.)]\s+/;

function stripListPrefix(line: string): string {
  return line.replace(BULLET_RE, '').replace(NUMBERED_RE, '').trim();
}

function isListLine(line: string): boolean {
  return BULLET_RE.test(line) || NUMBERED_RE.test(line);
}

type Segment = { type: 'p' | 'list'; lines: string[] };

function splitSegments(block: string): Segment[] {
  const lines = block.split('\n');
  const segments: Segment[] = [];
  let current: Segment | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    const type = isListLine(line) ? 'list' : 'p';
    if (!current || current.type !== type) {
      current = { type, lines: [] };
      segments.push(current);
    }
    current.lines.push(line);
  }
  return segments;
}

/** Split **bold** segments into nested Text nodes. */
function InlineText({
  text,
  style,
  boldStyle,
}: {
  text: string;
  style: TextStyle;
  boldStyle: TextStyle;
}) {
  const parts: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(
        <Text key={key++} style={style}>
          {text.slice(last, match.index)}
        </Text>,
      );
    }
    parts.push(
      <Text key={key++} style={[style, boldStyle]}>
        {match[1]}
      </Text>,
    );
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(
      <Text key={key++} style={style}>
        {text.slice(last).replace(/\*\*/g, '')}
      </Text>,
    );
  }

  if (parts.length === 0) {
    return <Text style={style}>{text.replace(/\*\*/g, '')}</Text>;
  }

  return <Text style={style}>{parts}</Text>;
}

/**
 * Renders Spendly / AI chat markdown: paragraphs, bullets, numbered lines, **bold**.
 */
export default function ChatMarkdown({ content, textStyle, inverted = false }: ChatMarkdownProps) {
  const base: TextStyle = {
    fontSize: 15,
    lineHeight: 22,
    color: inverted ? '#fff' : '#0f172a',
    ...textStyle,
  };
  const bold: TextStyle = { fontWeight: '700', color: inverted ? '#fff' : '#1e293b' };

  const blocks = content.trim().split(/\n\n+/);

  const renderList = (lines: string[], key: string) => (
    <View key={key} style={md.list}>
      {lines.map((line, li) => {
        const numbered = NUMBERED_RE.test(line);
        const body = stripListPrefix(line);
        return (
          <View key={`${key}-${li}`} style={md.listRow}>
            <View style={[md.bullet, numbered && md.bulletNum]}>
              {numbered ? (
                <Text style={[md.bulletTxt, inverted && md.bulletTxtInv]}>
                  {line.match(/^\s*(\d+)/)?.[1]}.
                </Text>
              ) : (
                <View style={[md.dot, inverted && md.dotInv]} />
              )}
            </View>
            <View style={md.listBody}>
              <InlineText text={body} style={base} boldStyle={bold} />
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={md.root}>
      {blocks.map((block, bi) => {
        const segments = splitSegments(block);
        return (
          <View key={`block-${bi}`} style={md.block}>
            {segments.map((seg, si) =>
              seg.type === 'list' ? (
                renderList(seg.lines, `list-${bi}-${si}`)
              ) : (
                <View key={`p-${bi}-${si}`} style={md.paragraph}>
                  {seg.lines.map((line, li) => (
                    <InlineText
                      key={`ln-${bi}-${si}-${li}`}
                      text={line.trim()}
                      style={base}
                      boldStyle={bold}
                    />
                  ))}
                </View>
              ),
            )}
          </View>
        );
      })}
    </View>
  );
}

const md = StyleSheet.create({
  root: { gap: 14 } satisfies Record<string, ViewStyle>,
  block: { gap: 12 },
  paragraph: { gap: 6 },
  list: { gap: 10 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  listBody: { flex: 1, flexShrink: 1 },
  bullet: { width: 22, paddingTop: 3, alignItems: 'center' },
  bulletNum: { width: 26, alignItems: 'flex-start' },
  bulletTxt: { fontSize: 13, fontWeight: '800', color: '#7c3aed' },
  bulletTxtInv: { color: '#e9d5ff' },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7c3aed',
    marginTop: 8,
  },
  dotInv: { backgroundColor: 'rgba(255,255,255,0.9)' },
});
