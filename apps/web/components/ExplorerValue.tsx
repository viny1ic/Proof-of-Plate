type Props = {
  href: string | null;
  value: string;
  /** Element to render when there is no link. Defaults to "span". */
  as?: "span" | "strong";
};

export function ExplorerValue({ href, value, as: Tag = "span" }: Props) {
  if (!href) return <Tag className="mono">{value}</Tag>;
  return (
    <a className="mono explorer-link" href={href} target="_blank" rel="noreferrer">
      {value}
    </a>
  );
}
