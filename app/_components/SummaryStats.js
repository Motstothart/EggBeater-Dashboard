export default function SummaryStats({ summary }) {
  if (!summary) return null;
  const items = [
    { label: "overdue", value: summary.overdueAthletes, cls: "overdue" },
    { label: "due soon", value: summary.warnAthletes, cls: "warn" },
    { label: "no data", value: summary.noDataAthletes, cls: "no-data" },
    { label: "on track", value: summary.okAthletes, cls: "ok" },
  ];
  const deliverableItems = [
    { label: "overdue deliverables", value: summary.overdueDeliverables, cls: "overdue" },
    { label: "deliverables due soon", value: summary.warnDeliverables, cls: "warn" },
  ];
  return (
    <div className="summary-stats">
      <div className="summary-group">
        <span className="summary-label">Athletes ({summary.totalAthletes}):</span>
        {items.map((item) => (
          <span key={item.label} className={`stat-pill ${item.cls}`}>
            <strong>{item.value}</strong> {item.label}
          </span>
        ))}
      </div>
      {(summary.overdueDeliverables > 0 || summary.warnDeliverables > 0) && (
        <div className="summary-group">
          {deliverableItems
            .filter((i) => i.value > 0)
            .map((item) => (
              <span key={item.label} className={`stat-pill ${item.cls}`}>
                <strong>{item.value}</strong> {item.label}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
