"use client";

import React, { useRef, useEffect, useState } from "react";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260715_090628_7052d8a6-a094-4341-a4a2-ad58493a67a9.mp4";

export default function BoomerangVideoBg() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [framesReady, setFramesReady] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let frames: ImageBitmap[] = [];
    let captureTimes = new Set<number>();
    let isCapturing = true;
    let captureAnimationId: number;
    let playbackAnimationId: number;
    let lastCaptureTime = 0;

    const captureFrame = async () => {
      if (!isCapturing || video.paused || video.ended) return;

      const now = performance.now();
      const time = video.currentTime;

      // Throttle capture to ~30fps max
      if (now - lastCaptureTime >= 33 && !captureTimes.has(time)) {
        lastCaptureTime = now;
        captureTimes.add(time);

        const maxW = 800; // Downscale to 800px width for massive RAM reduction
        const videoW = video.videoWidth;
        const videoH = video.videoHeight;
        if (videoW > 0 && videoH > 0) {
          const capW = Math.min(videoW, maxW);
          const capH = (videoH * capW) / videoW;

          try {
            const bitmap = await createImageBitmap(video, {
              resizeWidth: capW,
              resizeHeight: capH,
              resizeQuality: "low",
            });
            frames.push(bitmap);
          } catch (err) {
            console.error("Frame capture error:", err);
          }
        }
      }

      if ("requestVideoFrameCallback" in video) {
        // @ts-ignore
        video.requestVideoFrameCallback(captureFrame);
      } else {
        captureAnimationId = requestAnimationFrame(captureFrame);
      }
    };

    const startPlayback = (loadedFrames: ImageBitmap[]) => {
      const ctx = canvas.getContext("2d");
      if (!ctx || loadedFrames.length === 0) return;

      const sample = loadedFrames[0];
      canvas.width = sample.width;
      canvas.height = sample.height;

      let frameIndex = 0;
      let forward = true;

      const interval = 1000 / 30; // 30 fps
      let lastTime = performance.now();

      const loop = (now: number) => {
        const delta = now - lastTime;
        if (delta >= interval) {
          lastTime = now - (delta % interval);

          const currentFrame = loadedFrames[frameIndex];
          if (currentFrame) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(currentFrame, 0, 0);
          }

          if (forward) {
            if (frameIndex < loadedFrames.length - 1) {
              frameIndex++;
            } else {
              forward = false;
              frameIndex--;
            }
          } else {
            if (frameIndex > 0) {
              frameIndex--;
            } else {
              forward = true;
              frameIndex++;
            }
          }
        }

        playbackAnimationId = requestAnimationFrame(loop);
      };

      playbackAnimationId = requestAnimationFrame(loop);
    };

    const handlePlay = () => {
      isCapturing = true;
      if ("requestVideoFrameCallback" in video) {
        // @ts-ignore
        video.requestVideoFrameCallback(captureFrame);
      } else {
        captureAnimationId = requestAnimationFrame(captureFrame);
      }
    };

    const handleEnded = () => {
      isCapturing = false;
      if (captureAnimationId) cancelAnimationFrame(captureAnimationId);

      if (frames.length > 0) {
        setFramesReady(true);
        startPlayback(frames);
      }
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("ended", handleEnded);

    if (!video.paused) {
      handlePlay();
    }

    return () => {
      isCapturing = false;
      if (captureAnimationId) cancelAnimationFrame(captureAnimationId);
      if (playbackAnimationId) cancelAnimationFrame(playbackAnimationId);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("ended", handleEnded);

      // Clean up ImageBitmap frames to release memory
      frames.forEach((frame) => {
        if (typeof frame.close === "function") {
          frame.close();
        }
      });
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden w-full h-full bg-[#f8fafc]">
      {/* Skeleton Pulse Placeholder */}
      <div 
        className={`absolute inset-0 bg-[#e2e8f0]/40 animate-pulse transition-opacity duration-700 ease-out z-10 ${
          videoLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
        }`} 
      />

      <video
        ref={videoRef}
        src={VIDEO_URL}
        muted
        playsInline
        autoPlay
        preload="auto"
        crossOrigin="anonymous"
        onLoadedData={() => setVideoLoaded(true)}
        style={{ display: framesReady ? "none" : "block" }}
        className={`w-full h-full object-cover object-[15%_top] transition-opacity duration-700 ease-out ${
          videoLoaded ? "opacity-100" : "opacity-0"
        }`}
      />

      <canvas
        ref={canvasRef}
        style={{ display: framesReady ? "block" : "none" }}
        className={`w-full h-full object-cover object-[15%_top] transition-opacity duration-700 ease-out ${
          framesReady ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
