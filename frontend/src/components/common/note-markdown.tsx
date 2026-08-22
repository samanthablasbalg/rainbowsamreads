import Markdown from 'react-markdown';

// `>`, `*em*`/`_em_` and `**strong**` are plain CommonMark, so no remark-gfm. No sanitizer
// either: react-markdown escapes raw HTML in the source by default, and allowedElements
// caps the output to exactly what a note is allowed to contain.
export function NoteMarkdown({ children }: { children: string }) {
  return (
    <Markdown
      allowedElements={['p', 'blockquote', 'em', 'strong', 'br']}
      unwrapDisallowed
      components={{
        // Preflight strips blockquote styling and @tailwindcss/typography isn't
        // installed, so it needs its own classes rather than the default browser look.
        blockquote: ({ ...props }) => (
          <blockquote
            className="border-l-2 border-border pl-3 text-muted-foreground italic"
            {...props}
          />
        ),
      }}
    >
      {children}
    </Markdown>
  );
}
