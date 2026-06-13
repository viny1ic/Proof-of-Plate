import Link from "next/link";
import { DemoControls } from "../../components/DemoControls";
import { getDeployment } from "../../lib/data";

export default function AdminPage() {
  const deployment = getDeployment();

  return (
    <main className="shell">
      <div className="admin-layout">
        <section className="panel">
          <p className="muted">Proof of Plate admin</p>
          <h1>Demo operations</h1>
          <p>
            Batch <span className="mono">{deployment.batch.batchId}</span> is running in{" "}
            <span className="mono">{deployment.mode}</span> mode.
          </p>
          <Link className="btn" href={`/p/${deployment.batch.batchId}`}>
            Open product passport
          </Link>
        </section>
        <DemoControls />
      </div>
    </main>
  );
}
