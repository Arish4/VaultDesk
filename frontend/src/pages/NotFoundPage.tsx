import { Link } from "react-router-dom";
import { EmptyState } from "../components/StatusMessage";

export default function NotFoundPage() {
  return (
    <div className="page-wide">
      <EmptyState title="Page not found">
        <Link to="/">Back to the calendar →</Link>
      </EmptyState>
    </div>
  );
}
