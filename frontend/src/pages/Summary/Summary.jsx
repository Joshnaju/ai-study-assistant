import { useEffect, useState } from "react";
import { FileText, Sparkles, RefreshCw, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import api from "../../services/api";
import "./Summary.css";
import { Copy, Check } from "lucide-react";

function Summary() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [summary, setSummary] = useState("");
  const [summaryTitle, setSummaryTitle] = useState("");
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleCopySummary = async () => {
    if (!summary) return;

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy summary:", error);
      setError("Unable to copy the summary. Please try again.");
    }
  };

  const loadDocuments = async () => {
    setLoadingDocuments(true);
    setError("");

    try {
      const response = await api.get("documents/");
      const data = Array.isArray(response.data)
        ? response.data
        : response.data.results || [];

      setDocuments(data);

      const firstIndexed = data.find((document) => document.is_indexed);

      if (firstIndexed) {
        setSelectedDocumentId(String(firstIndexed.id));
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load documents. Please try again.",
      );
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleDocumentChange = (event) => {
    setSelectedDocumentId(event.target.value);
    setSummary("");
    setSummaryTitle("");
    setError("");
  };

  const handleGenerateSummary = async () => {
    if (!selectedDocumentId) {
      setError("Please select a document.");
      return;
    }

    setGenerating(true);
    setError("");
    setSummary("");
    setSummaryTitle("");

    try {
      const response = await api.post("summary/", {
        document_id: Number(selectedDocumentId),
      });

      setSummary(response.data.summary || "");
      setSummaryTitle(response.data.document_title || "Document Summary");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.detail ||
          "Unable to generate the summary. Please try again.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const selectedDocument = documents.find(
    (document) => String(document.id) === selectedDocumentId,
  );

  const indexedCount = documents.filter(
    (document) => document.is_indexed,
  ).length;

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {/* Page heading */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="bg-primary bg-opacity-10 text-primary rounded-3 p-3">
          <Sparkles size={28} />
        </div>

        <div>
          <h2 className="fw-bold mb-1">Document Summary</h2>
          <p className="text-secondary mb-0">
            Generate clear summaries from your study materials.
          </p>
        </div>
      </div>

      {/* Document selection card */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3 p-md-4">
          <div className="d-flex align-items-center gap-2 mb-2">
            <BookOpen size={21} className="text-primary" />
            <h5 className="fw-semibold mb-0">Select a document</h5>
          </div>

          <p className="text-secondary small mb-4">
            Choose an indexed document to create its study summary.
          </p>

          <label htmlFor="summaryDocument" className="form-label fw-semibold">
            Uploaded documents
          </label>

          <div className="row g-3 align-items-end">
            <div className="col-12 col-lg-8">
              <select
                id="summaryDocument"
                className="form-select"
                value={selectedDocumentId}
                onChange={handleDocumentChange}
                disabled={loadingDocuments || generating}
              >
                <option value="">
                  {loadingDocuments
                    ? "Loading documents..."
                    : "Select a document"}
                </option>

                {documents.map((document) => (
                  <option
                    key={document.id}
                    value={document.id}
                    disabled={!document.is_indexed}
                  >
                    {document.title ||
                      document.file?.split("/").pop() ||
                      `Document ${document.id}`}
                    {!document.is_indexed ? " (Not indexed)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-lg-4">
              <button
                type="button"
                className="btn btn-primary w-100 d-flex justify-content-center align-items-center gap-2"
                onClick={handleGenerateSummary}
                disabled={
                  loadingDocuments ||
                  generating ||
                  !selectedDocumentId ||
                  !selectedDocument?.is_indexed
                }
              >
                {generating ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      aria-hidden="true"
                    />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate Summary
                  </>
                )}
              </button>
            </div>
          </div>

          {!loadingDocuments && documents.length === 0 && (
            <div className="alert alert-info mt-3 mb-0">
              <FileText size={18} className="me-2" />
              No documents found. Upload a document from the Documents section
              first.
            </div>
          )}

          {!loadingDocuments && documents.length > 0 && indexedCount === 0 && (
            <div className="alert alert-warning mt-3 mb-0">
              No indexed documents are available. Please check the indexing
              status in the Documents section.
            </div>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Loading state */}
      {generating && (
        <div className="card border-0 shadow-sm text-center p-4 p-md-5 mb-4">
          <div className="mb-3 text-primary">
            <Sparkles size={38} />
          </div>

          <h5 className="fw-bold">Creating your summary...</h5>

          <p className="text-secondary mb-3">
            The AI is reviewing your document and organizing its important
            concepts. Please wait.
          </p>

          <div
            className="progress mx-auto"
            style={{ maxWidth: "350px", height: "6px" }}
            role="progressbar"
            aria-label="Generating summary"
          >
            <div className="progress-bar progress-bar-striped progress-bar-animated w-100" />
          </div>
        </div>
      )}

      {/* Generated summary */}
      {!generating && summary && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white border-bottom p-3 p-md-4">
            <div className="d-flex flex-wrap align-items-center gap-3">
              <div className="bg-primary bg-opacity-10 text-primary rounded-3 p-3">
                <FileText size={24} />
              </div>

              <div className="flex-grow-1">
                <h5 className="fw-bold mb-1">{summaryTitle}</h5>
                <span className="text-secondary small">
                  AI-generated study summary
                </span>
              </div>

              {/* Action buttons */}
              <div className="d-flex align-items-center gap-2 ms-auto">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
                  onClick={handleCopySummary}
                  title="Copy summary"
                  aria-label="Copy summary"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
                  onClick={handleGenerateSummary}
                  disabled={!selectedDocumentId}
                >
                  <RefreshCw size={15} />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>
          </div>

          <div className="card-body p-3 p-md-4">
            <article className="summary-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {summary}
              </ReactMarkdown>
            </article>
          </div>
        </div>
      )}
      {/* Initial empty state */}
      {!loadingDocuments && !generating && !summary && !error && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5 px-3">
            <div className="text-primary mb-3">
              <BookOpen size={42} />
            </div>

            <h5 className="fw-bold">Your summary will appear here</h5>

            <p className="text-secondary mb-0">
              Select an indexed document and click Generate Summary to get
              started.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Summary;
