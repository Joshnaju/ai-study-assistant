import { useEffect, useRef, useState } from "react";
import {
  uploadDocument,
  getDocuments,
  deleteDocument,
} from "../../services/documentService";
import "./Documents.css";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".docx"];

const formatFileSize = (bytes) => {
  if (bytes === null || bytes === undefined) return "Size unavailable";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getFileExtension = (filename = "") =>
  filename.split(".").pop().toLowerCase();

const getFileIcon = (filename = "") => {
  const extension = getFileExtension(filename);
  if (extension === "pdf") return "bi-file-earmark-pdf";
  if (extension === "docx") return "bi-file-earmark-word";
  if (extension === "txt") return "bi-file-earmark-text";
  return "bi-file-earmark";
};

const getErrorMessage = (error) => {
  const data = error.response?.data;
  if (typeof data?.file === "string") return data.file;
  if (Array.isArray(data?.file)) return data.file[0];
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string") return data;

  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue)) return String(firstValue[0]);
    if (typeof firstValue === "string") return firstValue;
  }

  return error.message || "Something went wrong. Please try again.";
};

function Documents() {
  const fileInputRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [documentToDelete, setDocumentToDelete] = useState(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoadingDocuments(true);
    setError("");

    try {
      const data = await getDocuments();
      setDocuments(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingDocuments(false);
    }
  };

  const validateFile = (file) => {
    if (!file) return "Please select a file.";

    const extension = `.${file.name.split(".").pop().toLowerCase()}`;
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return "Only PDF, TXT, and DOCX files are allowed.";
    }
    if (file.size === 0) return "The selected file is empty.";
    if (file.size > MAX_FILE_SIZE) {
      return "File size must not exceed 20 MB.";
    }
    return "";
  };

  const chooseFile = (file) => {
    setError("");
    setSuccess("");

    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setSelectedFile(null);
      setError(validationError);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleFileChange = (event) => {
    chooseFile(event.target.files?.[0]);
  };

  const openFilePicker = () => {
    if (!uploading) fileInputRef.current?.click();
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    if (!uploading) setDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    if (!uploading) chooseFile(event.dataTransfer.files?.[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile || uploading) return;

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      await uploadDocument(selectedFile);
      setSelectedFile(null);

      if (fileInputRef.current) fileInputRef.current.value = "";

      setSuccess("Document uploaded successfully.");
      await loadDocuments();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveSelectedFile = () => {
    setSelectedFile(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = (document) => {
    setError("");
    setDocumentToDelete(document);
  };

  const confirmDelete = async () => {
    if (!documentToDelete || deletingId !== null) return;

    const documentId = documentToDelete.id;
    setDeletingId(documentId);
    setError("");

    try {
      await deleteDocument(documentId);
      setDocuments((previous) =>
        previous.filter((doc) => doc.id !== documentId),
      );
      setDocumentToDelete(null);
      // Deliberately do not show a success alert for deletion.
    } catch (err) {
      setError(getErrorMessage(err));
      setDocumentToDelete(null);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (!documentToDelete) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && deletingId === null) {
        setDocumentToDelete(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [documentToDelete, deletingId]);

  return (
    <main className="documents-page">
      <div className="documents-container">
        <header className="documents-header">
          <div>
            <h1>My Study Materials</h1>
            <p>
              Upload your study materials and use them to learn with your AI
              Study Assistant.
            </p>
          </div>

          <div className="documents-count">
            <i className="bi bi-folder2-open" aria-hidden="true" />
            <span>{documents.length} documents</span>
          </div>
        </header>

        {error && (
          <div className="documents-alert documents-alert-error" role="alert">
            <i className="bi bi-exclamation-circle" aria-hidden="true" />
            <span>{error}</span>
            <button
              type="button"
              className="documents-alert-close"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
        )}

        {success && (
          <div
            className="documents-alert documents-alert-success"
            role="status"
          >
            <i className="bi bi-check-circle" aria-hidden="true" />
            <span>{success}</span>
            <button
              type="button"
              className="documents-alert-close"
              onClick={() => setSuccess("")}
              aria-label="Dismiss success message"
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
        )}

        <section className="upload-card">
          <div className="upload-card-heading">
            <div className="upload-heading-icon">
              <i className="bi bi-cloud-arrow-up" aria-hidden="true" />
            </div>
            <div>
              <h2>Upload a document</h2>
              <p>Add your study materials to get started.</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.docx"
            className="documents-file-input"
            onChange={handleFileChange}
            disabled={uploading}
            aria-label="Choose a study document"
          />

          <div
            className={`upload-dropzone ${
              dragging ? "upload-dropzone-active" : ""
            } ${uploading ? "upload-dropzone-disabled" : ""}`}
            role="button"
            tabIndex={uploading ? -1 : 0}
            aria-label="Choose or drop a PDF, TXT, or DOCX file"
            aria-disabled={uploading}
            onClick={openFilePicker}
            onKeyDown={(event) => {
              if (!uploading && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                openFilePicker();
              }
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="upload-cloud-icon">
              <i className="bi bi-cloud-arrow-up" aria-hidden="true" />
            </div>
            <h3>Drag and drop your file here</h3>
            <p>
              or <span className="browse-file-text">browse files</span> from
              your computer
            </p>
            <div className="upload-file-types">
              <span>PDF</span>
              <span>TXT</span>
              <span>DOCX</span>
              <span>Maximum 20 MB</span>
            </div>
          </div>

          {selectedFile && (
            <div className="selected-file-card">
              <div className="selected-file-icon">
                <i
                  className={`bi ${getFileIcon(selectedFile.name)}`}
                  aria-hidden="true"
                />
              </div>
              <div className="selected-file-info">
                <p className="selected-file-name">{selectedFile.name}</p>
                <span>{formatFileSize(selectedFile.size)}</span>
              </div>
              {!uploading && (
                <button
                  type="button"
                  className="remove-selected-file"
                  onClick={handleRemoveSelectedFile}
                  aria-label="Remove selected file"
                  title="Remove selected file"
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          <div className="upload-actions">
            <button
              type="button"
              className="upload-submit-btn"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm"
                    aria-hidden="true"
                  />
                  Uploading...
                </>
              ) : (
                <>
                  <i className="bi bi-cloud-arrow-up" aria-hidden="true" />
                  Upload document
                </>
              )}
            </button>
          </div>
        </section>

        <section className="documents-list-section">
          <div className="documents-list-header">
            <div>
              <h2>Uploaded documents</h2>
              <p>Manage the study materials you have uploaded.</p>
            </div>
            <span className="documents-list-count">{documents.length}</span>
          </div>

          {loadingDocuments ? (
            <div className="documents-loading">
              <span
                className="spinner-border"
                role="status"
                aria-label="Loading documents"
              />
              <p>Loading your documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="documents-empty-state">
              <div className="documents-empty-icon">
                <i className="bi bi-file-earmark-text" aria-hidden="true" />
              </div>
              <h3>No documents yet</h3>
            </div>
          ) : (
            <div className="documents-list">
              {documents.map((document) => (
                <article className="document-item" key={document.id}>
                  {/* File icon */}
                  <div className="">
                    <i
                      className={`bi fs-3 ${
                        (document.title || document.file)
                          .toLowerCase()
                          .endsWith(".pdf")
                          ? "bi-file-earmark-pdf-fill text-danger"
                          : (document.title || document.file)
                                .toLowerCase()
                                .endsWith(".docx")
                            ? "bi-file-earmark-word-fill text-primary"
                            : "bi-file-earmark-text-fill text-success"
                      }`}
                      aria-hidden="true"
                    />
                  </div>

                  {/* Document details */}
                  <div className="document-details">
                    <h3 className="document-title">
                      {document.title || "Untitled document"}
                    </h3>

                    <div className="document-metadata">
                      <span>{formatFileSize(document.file_size)}</span>

                      {document.uploaded_at && (
                        <>
                          <span className="metadata-separator">•</span>
                          <span>{formatDate(document.uploaded_at)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Indexed status */}
                  <div className="document-status-container">
                    <span
                      className={`badge rounded-pill fw-normal ${
                        document.is_indexed
                          ? "bg-success-subtle text-success"
                          : "bg-danger-subtle text-danger"
                      }`}
                    >
                      {document.is_indexed ? "Indexed" : "Not Indexed"}
                    </span>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    className="document-delete-btn"
                    onClick={() => handleDelete(document)}
                    disabled={deletingId !== null}
                    aria-label={`Delete ${document.title || "document"}`}
                    title="Delete document"
                  >
                    <i className="bi bi-trash3" aria-hidden="true" />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {documentToDelete && (
        <div
          className="delete-modal-overlay"
          onClick={() => {
            if (deletingId === null) setDocumentToDelete(null);
          }}
        >
          <div
            className="delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            {/* <div className="delete-modal-icon">
              <i className="bi bi-trash3" aria-hidden="true" />
            </div> */}

            <h3 id="delete-modal-title">Delete document</h3>
            <p className="delete-modal-message">
              Are you sure you want to delete{" "}
              <strong>{documentToDelete.title || "this document"}</strong>?
            </p>
            <p className="delete-modal-warning">
              This action cannot be undone.
            </p>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="delete-confirm-btn"
                onClick={confirmDelete}
                disabled={deletingId !== null}
              >
                {deletingId === documentToDelete.id ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      aria-hidden="true"
                    />
                    Deleting...
                  </>
                ) : (
                  <>Delete</>
                )}
              </button>
              <button
                type="button"
                className="delete-cancel-btn"
                onClick={() => setDocumentToDelete(null)}
                disabled={deletingId !== null}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Documents;
