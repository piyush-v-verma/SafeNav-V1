import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Camera,
  FolderOpen,
  UploadCloud,
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
  X,
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

  // Live in-browser camera state & refs
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const captureCurrentLocation = useCallback(() => {
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
  }, [toast]);

  // Automatically detect user GPS location on mount
  useEffect(() => {
    captureCurrentLocation();
  }, [captureCurrentLocation]);

  // Single upload dropzone state
  const [isDragging, setIsDragging] = useState(false);

  // Common file processing logic
  const processFile = (file) => {
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

  // Handle image file selection from inputs
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Handle opening live camera
  const handleOpenCamera = () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.warning("Live camera access is not supported in this browser. Opening file selector.");
      cameraInputRef.current?.click();
      return;
    }
    setIsCameraActive(true);
  };

  // Manage live camera media stream lifecycle
  useEffect(() => {
    if (!isCameraActive) return;

    let activeStream = null;
    let isCancelled = false;

    async function startCamera() {
      try {
        setIsCameraLoading(true);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        activeStream = stream;
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        setIsCameraLoading(false);

        // Check for multiple camera devices
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoDevices.length > 1);
      } catch (err) {
        if (isCancelled) return;
        console.warn("Camera access error:", err);
        setIsCameraActive(false);
        setIsCameraLoading(false);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          toast.warning("Camera permission was denied. Opening file selector instead.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          toast.warning("No camera device was detected. Opening file selector instead.");
        } else {
          toast.warning("Unable to open camera. Opening file selector instead.");
        }
        cameraInputRef.current?.click();
      }
    }

    const currentVideo = videoRef.current;
    startCamera();

    return () => {
      isCancelled = true;
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (currentVideo) {
        currentVideo.srcObject = null;
      }
    };
  }, [isCameraActive, facingMode, toast]);

  // Capture frame from live video feed
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Failed to capture image. Please try again.");
          return;
        }
        const file = new File(
          [blob],
          `road_hazard_${Date.now()}.jpg`,
          { type: "image/jpeg" }
        );
        setIsCameraActive(false);
        processFile(file);
        toast.success("Photo captured successfully.");
      },
      "image/jpeg",
      0.92
    );
  };

  const handleCloseCamera = () => {
    setIsCameraActive(false);
  };

  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processFile(file);
    }
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
                <div className="single-upload-container">
                  {/* Single Image Upload Field */}
                  <div
                    className={`single-upload-dropzone ${isDragging ? "dragging" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => galleryInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        galleryInputRef.current?.click();
                      }
                    }}
                    aria-label="Upload road issue photograph"
                  >
                    <div className="upload-dropzone-icon">
                      <UploadCloud size={30} strokeWidth={2.2} />
                    </div>
                    <div className="upload-dropzone-text">
                      <span className="upload-dropzone-title">Upload road issue photo</span>
                      <span className="upload-dropzone-sub">
                        Click or drag & drop photo here
                      </span>
                      <span className="upload-dropzone-meta">
                        JPEG, PNG, WebP &bull; Max 15 MB
                      </span>
                    </div>
                  </div>

                  {/* Two Options Below */}
                  <div className="upload-options-row">
                    <button
                      type="button"
                      className="upload-option-btn camera-option"
                      onClick={handleOpenCamera}
                    >
                      <div className="option-icon-wrap camera-wrap">
                        <Camera size={18} strokeWidth={2.2} />
                      </div>
                      <span>Open Camera</span>
                    </button>

                    <button
                      type="button"
                      className="upload-option-btn files-option"
                      onClick={() => galleryInputRef.current?.click()}
                    >
                      <div className="option-icon-wrap files-wrap">
                        <FolderOpen size={18} strokeWidth={2.2} />
                      </div>
                      <span>Select Files</span>
                    </button>
                  </div>
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

        {/* Live Camera Viewfinder Modal */}
        {isCameraActive && (
          <div
            className="camera-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Camera Viewfinder"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCloseCamera();
            }}
          >
            <div className="camera-modal-card">
              <div className="camera-modal-header">
                <div className="camera-modal-title">
                  <Camera size={18} />
                  <span>Live Camera</span>
                </div>
                <button
                  type="button"
                  className="camera-modal-close"
                  onClick={handleCloseCamera}
                  aria-label="Close camera"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="camera-viewfinder-wrap">
                {isCameraLoading && (
                  <div className="camera-loading-overlay">
                    <Loader2 size={32} className="spin-icon" />
                    <span>Accessing camera...</span>
                  </div>
                )}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="camera-video-preview"
                />
                <div className="camera-viewfinder-overlay">
                  <div className="viewfinder-corner top-left" />
                  <div className="viewfinder-corner top-right" />
                  <div className="viewfinder-corner bottom-left" />
                  <div className="viewfinder-corner bottom-right" />
                  <span className="viewfinder-guide-text">
                    Align road hazard within frame
                  </span>
                </div>
              </div>

              <div className="camera-controls-bar">
                {hasMultipleCameras ? (
                  <button
                    type="button"
                    className="camera-switch-btn"
                    onClick={handleSwitchCamera}
                    title="Switch Camera"
                    aria-label="Switch Camera"
                  >
                    <RefreshCw size={18} />
                  </button>
                ) : (
                  <div style={{ width: "44px" }} />
                )}

                <button
                  type="button"
                  className="camera-capture-btn"
                  onClick={handleCapturePhoto}
                  disabled={isCameraLoading}
                  aria-label="Capture Photo"
                  title="Capture Photo"
                >
                  <div className="camera-capture-inner" />
                </button>

                <button
                  type="button"
                  className="camera-cancel-btn"
                  onClick={handleCloseCamera}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
