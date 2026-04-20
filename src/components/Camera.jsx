import { useEffect, useState } from "react";

export default function Camera({ videoRef }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stream;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        });
        if (videoRef.current) {
          const video = videoRef.current;
          if (video.srcObject !== stream) video.srcObject = stream;
          const playPromise = video.play();
          if (playPromise !== undefined) playPromise.catch(() => {});
          setLoading(false);
        }
      } catch (err) {
        setError(err.message || "Camera access denied");
        setLoading(false);
      }
    }

    startCamera();
    return () => { if (stream) stream.getTracks().forEach((t) => t.stop()); };
  }, []);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "absolute", top: 0, left: 0,
          width: "100vw", height: "100vh",
          objectFit: "cover", transform: "scaleX(-1)", zIndex: 0,
          pointerEvents: "none"
        }}
      />

      {loading && (
        <div style={overlayStyle}>
          <div style={spinnerStyle} />
          <p style={msgStyle}>Initializing Camera</p>
        </div>
      )}

      {error && (
        <div style={overlayStyle}>
          <div style={{ fontSize: "44px", marginBottom: "16px" }}>📷</div>
          <p style={{ ...msgStyle, color: "#ff5555" }}>Camera Error</p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", marginTop: "8px", maxWidth: "300px", textAlign: "center" }}>
            {error}. Please allow camera access and refresh.
          </p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

const overlayStyle = {
  position: "absolute", top: 0, left: 0, width: "100vw", height: "100vh",
  background: "linear-gradient(135deg, #06061a 0%, #120a28 50%, #06120a 100%)",
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 100,
};

const msgStyle = {
  color: "rgba(255,255,255,0.85)", fontFamily: "'Orbitron', monospace",
  fontSize: "15px", letterSpacing: "4px", textTransform: "uppercase", marginTop: "20px",
};

const spinnerStyle = {
  width: "48px", height: "48px",
  border: "2px solid rgba(255,215,0,0.15)",
  borderTop: "2px solid #FFD700",
  borderRadius: "50%",
  animation: "spin 0.9s linear infinite",
};