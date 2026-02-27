"use client";
import React, { useEffect, useState, useRef } from "react";
import Hls from "hls.js";

export default function LivePage() {
  const [error, setError] = useState(false);
  const videoRef = React.useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const streamUrl = "http://localhost:8080/live/stream.m3u8";

    let hls;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
    } else if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, function (event, data) {
        console.error("HLS error", data);
        setError(true);
      });
    } else {
      setError(true);
    }

    video.addEventListener("error", () => setError(true));
    
    video.autoplay = true;
    video.muted = true;
    video.controls = true;

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      {error ? (
        <p className="text-white">Stream is offline.</p>
      ) : (
        <video
          ref={videoRef}
          className="max-w-full w-full max-h-full"
          style={{ maxWidth: "900px" }}
        />
      )}
    </div>
  );
}
