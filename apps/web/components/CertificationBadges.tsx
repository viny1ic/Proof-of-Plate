import type { CSSProperties } from "react";
import {
  certificationExplorerUrl,
  certificationSbtDescription,
  certificationStatusLabel,
  isCertificationActive,
} from "../lib/certifications";
import type { AuthorityCertification } from "../lib/types";

function statusClass(certification: AuthorityCertification) {
  if (certification.status === "revoked") return "revoked";
  return isCertificationActive(certification) ? "active" : "expired";
}

function CertificationBadge({ certification }: { certification: AuthorityCertification }) {
  const href = certificationExplorerUrl(certification);
  const status = certificationStatusLabel(certification);
  const className = `pp-cert-badge ${statusClass(certification)}`;
  const style = certification.accentColor
    ? ({ "--cert-accent": certification.accentColor } as CSSProperties)
    : undefined;

  const inner = (
    <>
      <span className="pp-cert-logo" aria-hidden="true">
        {certification.logoText}
      </span>
      <span className="pp-cert-copy">
        <span className="pp-cert-label">{certification.shortLabel}</span>
        <span className="pp-cert-issuer">{certification.issuerName}</span>
      </span>
      <span className="pp-cert-status">{status}</span>
    </>
  );

  const title = `${certification.title} — ${certification.issuerName}. ${certificationSbtDescription(certification)}`;

  if (!href) {
    return (
      <span className={className} style={style} title={title} aria-label={certification.logoAlt}>
        {inner}
      </span>
    );
  }

  return (
    <a
      className={className}
      style={style}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      aria-label={`${certification.logoAlt}. Open certificate token on HashScan.`}
    >
      {inner}
    </a>
  );
}

export function CertificationBadges({ certifications }: { certifications: AuthorityCertification[] }) {
  if (certifications.length === 0) return null;

  return (
    <section className="pp-cert-panel" aria-label="Third-party certificate tokens">
      <div className="pp-cert-head">
        <div>
          <div className="pp-cert-title">Third-party certificates</div>
          <div className="pp-cert-sub">Authority-issued SBT badges linked to HTS token pages</div>
        </div>
        <span className="pp-cert-count">{certifications.length}</span>
      </div>
      <div className="pp-cert-badges">
        {certifications.map((certification) => (
          <CertificationBadge key={certification.certId} certification={certification} />
        ))}
      </div>
      <p className="pp-cert-note inspector-only">
        SBT means the certificate is intended to be non-transferable: minted by the authority treasury for this batch with no public transfer path in the demo. Production HTS deployments should add custom custody, pause/freeze/KYC/admin-key, or contract controls where hard non-transferability is required.
      </p>
    </section>
  );
}
