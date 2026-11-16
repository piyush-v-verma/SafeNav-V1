import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Camera,
  Image as ImageIcon,
  MapPin,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Trash2,
  Loader2,
  Copy,
  Check,
  Send,
  ShieldAlert,
} from "lucide-react";
import { submitHazardReport } from "../../services/api";
import { useToast } from "../../../../shared/toast/ToastProvider";
import "./ReportHazardPage.css";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB limit
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export default function ReportHazardPage() {
  const navigate = useNavigate();
  const toast = useToast();

  // Form inputs (strictly photo + optional description)
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [description, setDescription] = useState("");

  // Automatic GPS state
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsStatus, setGpsStatus] = useState("detecting"); // 'detecting' | 'detected' | 'denied' | 'error'
  const [gpsErrorMsg, setGpsErrorMsg] = useState(null);

  // Submission & UI feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [submittedReport, setSubmittedReport] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  // Hidden file inputs
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Automatically detect user GPS location on mount
  useEffect(() => {
    captureCurrentLocation();
  }, []);

  const captureCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      setGpsErrorMsg("Geolocation is not supported by your browser or device.");
      return;
    }

    setGpsStatus("detecting");
    setGpsErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setGpsStatus("detected");
        toast.success("Current location retrieved.", { dedupeKey: "location-retrieved" });
      },
      (err) => {
        console.warn("GPS detection error:", err);
        if (err.code === err.PERMISSION_DENIED) {
          const message = "Location permission was denied. Please allow location access in your browser settings to submit road hazard reports.";
          setGpsStatus("denied");
          setGpsErrorMsg(message);
          toast.warning(message, { dedupeKey: "report-location-denied" });
        } else {
          setGpsStatus("error");
          const message = "Unable to acquire accurate GPS position. Please try again.";
          setGpsErrorMsg(message);
          toast.error(message, { dedupeKey: "report-location-error" });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  };

  // Handle image file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormError(null);

    // Validate type
    if (!ALLOWED_MIME_TYPES.includes(file.type) && !file.name.match(/\.(jpe?g|png|webp|heic|heif)$/i)) {
      setFormError("Unsupported file format. Please capture or upload a JPEG, PNG, or WebP photo.");
      return;
    }

    // Validate size
    if (file.size > MAX_IMAGE_BYTES) {
      setFormError("The selected photo exceeds the 15 MB limit. Please select a smaller photo.");
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target.result);
    };
    reader.onerror = () => {
      setFormError("Failed to read image file. Please try another photo.");
      setSelectedFile(null);
      setImagePreview(null);
    };
    reader.readAsDataURL(file);

    // Reset inputs
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setFormError(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  // Copy report ID to clipboard
  const handleCopyReportId = () => {
    if (!submittedReport?.report_id) return;
    navigator.clipboard.writeText(submittedReport.report_id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Handle form submission
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedFile || !imagePreview) {
      setFormError("Please provide a photograph of the road issue.");
      return;
    }

    if (!gpsCoords || gpsStatus !== "detected") {
      setFormError("Accurate GPS location is required. Please ensure location is enabled.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await submitHazardReport({
        image: imagePreview,
        imageFilename: selectedFile.name || "road_issue.jpg",
        description: description,
        latitude: gpsCoords.latitude,
        longitude: gpsCoords.longitude,
        accuracy: gpsAccuracy,
      });

      setSubmittedReport({
        report_id: response.report_id || response.data?.report_id,
        status: response.status_text || "Processing",
        message: response.message,
        latitude: gpsCoords.latitude,
        longitude: gpsCoords.longitude,
        accuracy: gpsAccuracy,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        imagePreview: imagePreview,
      });
      toast.success("Road issue report submitted.");
    } catch (err) {
      console.error("Report submission failed:", err);
      setFormError("Failed to submit report. Please check your network and try again.");
      toast.error("Report submission failed. Please try again.", { dedupeKey: "report-submit-error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset to submit another report
  const handleResetForm = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setDescription("");
    setSubmittedReport(null);
    setFormError(null);
    captureCurrentLocation();
  };

  return (
    <div className="report-hazard-container">
      <div className="report-hazard-card">
        {/* Top Header */}
        <header className="report-header">
          <div className="report-header-title">
            <div className="report-header-icon-wrap">
              <ShieldAlert size={22} className="report-header-icon" />
            </div>
            <div>
              <h1 className="report-title">Report Road Issue</h1>
              <p className="report-subtitle">
                AI-Assisted Citizen Reporting &bull; Nagpur
              </p>
            </div>
          </div>
          <Link to="/" className="report-back-btn" title="Return to Map">
            <ArrowLeft size={16} />
            <span>Map</span>
          </Link>
        </header>

        {/* Success Confirmation View */}
        {submittedReport ? (
          <div className="report-success-view">
            <div className="success-badge-icon">
              <CheckCircle2 size={42} strokeWidth={2.4} />
            </div>

            <h2 className="success-title">Report Received</h2>
            <p className="success-subtitle">
              Your road issue report has been recorded and queued for automated AI verification.
            </p>

            {/* Report Reference Card */}
            <div className="report-ref-box">
              <div className="ref-row">
                <span className="ref-label">Report ID</span>
                <div className="ref-id-wrap">
                  <code className="ref-id-code">{submittedReport.report_id}</code>
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={handleCopyReportId}
                    title="Copy Report ID"
                  >
                    {copiedId ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="ref-row">
                <span className="ref-label">Current Status</span>
                <span className="status-pill-processing">
                  <span className="pulse-dot-amber" />
                  <span>Processing</span>
                </span>
              </div>

              <div className="ref-row">
                <span className="ref-label">GPS Location</span>
                <span className="ref-value">
                  {submittedReport.latitude.toFixed(6)}, {submittedReport.longitude.toFixed(6)}
                  {submittedReport.accuracy && ` (±${submittedReport.accuracy}m)`}
                </span>
              </div>

              <div className="ref-row">
                <span className="ref-label">Submitted At</span>
                <span className="ref-value">{submittedReport.timestamp}</span>
              </div>
            </div>

            {/* AI Note Banner */}
            <div className="ai-notice-banner">
              <p>
                <strong>Next Step:</strong> SafeNav's automated AI pipeline will assess this photograph to identify hazard type, severity, and road safety impact.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="success-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleResetForm}
              >
                Submit Another Report
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate("/")}
              >
                Return to Live Map
              </button>
            </div>
          </div>
        ) : (
          /* Report Submission Form */
          <form className="report-form" onSubmit={handleSubmitReport}>
            {/* 1. Required Photograph Section */}
            <section className="form-section">
              <div className="section-label-row">
                <label className="section-label">
                  Road Issue Photograph <span className="required-star">*</span>
                </label>
                <span className="section-hint">Required for AI analysis</span>
              </div>

              {/* Hidden Native File Inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                style={{ display: "none" }}
                aria-label="Capture with Camera"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: "none" }}
                aria-label="Upload from Gallery"
              />

              {!imagePreview ? (
                <div className="photo-picker-deck">
                  <button
                    type="button"
                    className="photo-btn camera-btn"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <div className="photo-btn-icon-wrap camera-icon-bg">
                      <Camera size={26} strokeWidth={2.2} />
                    </div>
                    <span className="photo-btn-title">Take Photo</span>
                    <span className="photo-btn-desc">Open device camera</span>
                  </button>

                  <button
                    type="button"
                    className="photo-btn gallery-btn"
                    onClick={() => galleryInputRef.current?.click()}
                  >
                    <div className="photo-btn-icon-wrap gallery-icon-bg">
                      <ImageIcon size={26} strokeWidth={2.2} />
                    </div>
                    <span className="photo-btn-title">Upload Image</span>
                    <span className="photo-btn-desc">Browse files or gallery</span>
                  </button>
                </div>
              ) : (
                /* Image Preview Card */
                <div className="image-preview-card">
                  <div className="preview-img-wrap">
                    <img
                      src={imagePreview}
                      alt="Selected road hazard preview"
                      className="preview-img"
                    />
                  </div>
                  <div className="preview-info-bar">
                    <div className="preview-file-details">
                      <span className="file-name" title={selectedFile?.name}>
                        {selectedFile?.name || "road_issue.jpg"}
                      </span>
                      <span className="file-size">
                        {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : ""}
                      </span>
                    </div>
                    <div className="preview-actions">
                      <button
                        type="button"
                        className="btn-replace"
                        onClick={() => galleryInputRef.current?.click()}
                        title="Replace Photo"
                      >
                        <RefreshCw size={14} />
                        <span>Replace</span>
                      </button>
                      <button
                        type="button"
                        className="btn-remove"
                        onClick={handleRemoveImage}
                        title="Remove Photo"
                      >
                        <Trash2 size={14} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* 2. Optional Description Section */}
            <section className="form-section">
              <div className="section-label-row">
                <label htmlFor="hazard-description" className="section-label">
                  Description <span className="optional-badge">Optional</span>
                </label>
                <span className="section-hint">AI will inspect the photo even if blank</span>
              </div>
              <textarea
                id="hazard-description"
                className="description-textarea"
                rows={3}
                placeholder="Add any helpful details or landmarks (e.g. Near Sitabuldi metro station)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                disabled={isSubmitting}
              />
            </section>

            {/* 3. Automatic Location Section */}
            <section className="form-section">
              <div className="section-label-row">
                <label className="section-label">
                  Hazard Location <span className="auto-badge">Automatic GPS</span>
                </label>
                {gpsStatus === "detected" && (
                  <button
                    type="button"
                    className="gps-refresh-btn"
                    onClick={captureCurrentLocation}
                    title="Refresh GPS Coordinates"
                  >
                    <RefreshCw size={12} />
                    <span>Refresh</span>
                  </button>
                )}
              </div>

              {gpsStatus === "detecting" && (
                <div className="gps-pill detecting">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Acquiring high-accuracy GPS coordinates...</span>
                </div>
              )}

              {gpsStatus === "detected" && gpsCoords && (
                <div className="gps-pill detected">
                  <MapPin size={16} className="pin-icon" />
                  <div className="gps-details">
                    <span className="gps-coords">
                      {gpsCoords.latitude.toFixed(6)}, {gpsCoords.longitude.toFixed(6)}
                    </span>
                    {gpsAccuracy && (
                      <span className="gps-acc"> &bull; Accurate to ±{gpsAccuracy}m</span>
                    )}
                  </div>
                </div>
              )}

              {(gpsStatus === "denied" || gpsStatus === "error") && (
                <div className="gps-error-card">
                  <div className="gps-error-icon">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="gps-error-content">
                    <p className="gps-error-title">
                      {gpsStatus === "denied" ? "Location Permission Required" : "GPS Unavailable"}
                    </p>
                    <p className="gps-error-desc">
                      {gpsErrorMsg || "Please allow GPS access so emergency & civic authorities know where this hazard is located."}
                    </p>
                    <button
                      type="button"
                      className="gps-retry-btn"
                      onClick={captureCurrentLocation}
                    >
                      <RefreshCw size={13} />
                      <span>Retry Detecting GPS</span>
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Form Level Error Alert */}
            {formError && (
              <div className="form-error-alert" role="alert">
                <AlertTriangle size={16} />
                <span>{formError}</span>
              </div>
            )}

            {/* Submit Action Button */}
            <div className="form-submit-row">
              <button
                type="submit"
                className="submit-report-btn"
                disabled={isSubmitting || !selectedFile || gpsStatus !== "detected"}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Submitting Report...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Submit Hazard Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
