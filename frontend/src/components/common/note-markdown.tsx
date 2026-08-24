import Markdown from 'react-markdown';

export function NoteMarkdown({ children }: { children: string }) {
  return (
    <Markdown
      allowedElements={['p', 'blockquote', 'em', 'strong', 'br']}
      unwrapDisallowed
      components={{
        // Preflight strips blockquote styling and @tailwindcss/typography isn't
        // installed, so it needs its own classes rather than the default browser look.
        // That includes the gap between blocks: preflight zeroes the margin on p and
        // blockquote both, so without this a multi-paragraph note runs together.
        blockquote: ({ ...props }) => (
          <blockquote
            className="mt-2 border-l-2 border-border pl-3 text-muted-foreground italic first:mt-0"
            {...props}
          />
        ),
        p: ({ ...props }) => <p className="mt-2 first:mt-0" {...props} />,
      }}
    >
      {children}
    </Markdown>
  );
}
