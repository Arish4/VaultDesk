import { useState } from "react";
import { maintenanceApi, spacesApi } from "../api/vaultdesk";
import { useAuthStore } from "../stores/authStore";
import { useSummaryStore } from "../stores/summaryStore";
import { Button } from "../components/Button";
import { Icon } from "../components/icons";
import { Modal } from "../components/Modal";
import { EmptyState, ErrorMessage, Loading } from "../components/StatusMessage";
import { useApi } from "../hooks/useApi";
import { useBuilding } from "../hooks/useBuilding";
import { formatDay } from "../utils/time";

const FILTERS = [
  { value: "unresolved", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "", label: "All" },
];

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];

function ReportIssueForm({ onDone }) {
  const [building] = useBuilding();
  const spaces = useApi((signal) => spacesApi.list({ location: building }, signal), [building]);
  const [form, setForm] = useState({ space: "", title: "", description: "", priority: "medium", blocks_booking: false });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (field) => (event) =>
    setForm({ ...form, [field]: event.target.type === "checkbox" ? event.target.checked : event.target.value });

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await maintenanceApi.report({ ...form, space: Number(form.space) });
      onDone();
    } catch (err) {
      setError(err);
      setSaving(false);
    }
  }

  return (
    <form className="booking-form" onSubmit={submit}>
      <label>
        Room
        <select value={form.space} onChange={set("space")} required>
          <option value="">Choose a room…</option>
          {(spaces.data?.results ?? []).map((space) => (
            <option key={space.id} value={space.id}>
              {space.name} · {space.location.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        What's wrong?
        <input value={form.title} onChange={set("title")} placeholder="e.g. Projector not turning on" required maxLength={140} />
      </label>
      <label>
        Details (optional)
        <textarea value={form.description} onChange={set("description")} rows={3} />
      </label>
      <div className="form-row">
        <label>
          Priority
          <select value={form.priority} onChange={set("priority")}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={form.blocks_booking} onChange={set("blocks_booking")} />
          Room can't be used until fixed
        </label>
      </div>
      <ErrorMessage error={error} />
      <Button type="submit" loading={saving}>
        Report issue
      </Button>
    </form>
  );
}

export default function MaintenancePage() {
  const isStaff = useAuthStore((state) => Boolean(state.user?.is_staff));
  const refreshSummary = useSummaryStore((state) => state.refresh);
  const [building] = useBuilding();
  const [filter, setFilter] = useState("unresolved");
  const [reporting, setReporting] = useState(false);
  const [error, setError] = useState(null);
  const issues = useApi((signal) => maintenanceApi.list({ status: filter, location: building }, signal), [filter, building]);

  async function changeStatus(issue, status) {
    setError(null);
    try {
      await maintenanceApi.setStatus(issue.id, status);
      issues.reload();
      refreshSummary();
    } catch (err) {
      setError(err);
    }
  }

  const list = issues.data?.results ?? [];

  return (
    <div className="page-wide">
      <header className="page-header">
        <div>
          <h2 className="page-title">Maintenance</h2>
          <p className="muted">Report problems in a room. Rooms marked "can't be used" are blocked on the calendar.</p>
        </div>
        <Button onClick={() => setReporting(true)}>
          <Icon name="plus" size={18} /> Report issue
        </Button>
      </header>

      <div className="chips">
        {FILTERS.map((f) => (
          <button key={f.value} className={`chip ${filter === f.value ? "chip--active" : ""}`} onClick={() => setFilter(f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      <ErrorMessage error={error} />
      {issues.loading && !issues.data && <Loading />}
      <ErrorMessage error={issues.error} onRetry={issues.reload} />
      {issues.data && list.length === 0 && <EmptyState title="No issues here. Everything works." />}

      <div className="stack">
        {list.map((issue) => (
          <article key={issue.id} className="issue">
            <span className={`priority priority--${issue.priority}`} title={`${issue.priority} priority`} />
            <div className="issue__main">
              <strong>{issue.title}</strong>
              <span className="muted">
                {issue.space_name} · {issue.location_name} · reported by {issue.reported_by ?? "someone"} on{" "}
                {formatDay(issue.created_at)}
              </span>
              {issue.description && <p>{issue.description}</p>}
            </div>
            {issue.blocks_booking && issue.status !== "resolved" && (
              <span className="pill pill--rejected">
                <Icon name="alert" size={14} /> Room blocked
              </span>
            )}
            {isStaff ? (
              <select
                className="status-select"
                value={issue.status}
                onChange={(event) => changeStatus(issue, event.target.value)}
                aria-label={`Status of ${issue.title}`}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className={`pill pill--issue-${issue.status}`}>
                {STATUS_OPTIONS.find((option) => option.value === issue.status)?.label}
              </span>
            )}
          </article>
        ))}
      </div>

      {reporting && (
        <Modal title="Report an issue" subtitle="The facilities team gets it straight away." onClose={() => setReporting(false)}>
          <ReportIssueForm
            onDone={() => {
              setReporting(false);
              issues.reload();
              refreshSummary();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
