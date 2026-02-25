// ===== Imports =====
import React, { useEffect, useState } from "react";
import "./History.css";

// ===== History Component =====
const History = ({ userEmail }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) return;

    setLoading(true);
    fetch(`${import.meta.env.VITE_API_BASE_URL}/history/${userEmail}`)
      .then((res) => res.json())
      .then((data) => {
        // Normalize results: treat 'success' or 'fail' explicitly
        const normalized = data.map((item) => ({
          ...item,
          result:
            item.result?.status?.toLowerCase() === "fail" ? "fail" : "success",
        }));
        setHistory(normalized);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userEmail]);

  return (
    <div className="history-wrapper">
      <div className="history-header">
        <h3 className="history-title">Test History</h3>
        <span className="history-count">{history.length} tests</span>
      </div>

      {loading && (
        <div className="history-loading">
          <div className="spinner"></div>
          <p>Loading history...</p>
        </div>
      )}

      {!loading && history.length === 0 && (
        <div className="history-empty">
          <p>No tests run yet</p>
        </div>
      )}

      <div
        className={`history-grid ${history.length === 1 ? "single" : "multi"}`}
      >
        {history.map((item, index) => (
          <div key={item._id} className="history-card">
            <div className="history-card-header">
              <div className="history-icon">📄</div>
              <div className="history-status">
                <span
                  className={`status-badge ${item.result === "success" ? "passed" : "failed"
                    }`}
                >
                  {item.result === "success" ? "Passed" : "Failed"}
                </span>
              </div>
            </div>

            <p className="history-url">{item.url}</p>
            <div className="history-footer">
              <span className="history-date">
                {new Date(item.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default History;
