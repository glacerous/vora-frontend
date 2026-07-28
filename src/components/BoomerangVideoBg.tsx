"use client";

import React, { useRef, useEffect, useState } from "react";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260715_090628_7052d8a6-a094-4341-a4a2-ad58493a67a9.mp4";

export default function BoomerangVideoBg() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [framesReady, setFramesReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let frames: HTMLCanvasElement[] = [];
    let captureTimes = new Set<number>();
    let isCapturing = true;
    let animationId: number;

    const captureFrame = () => {
      if (!isCapturing || video.paused || video.ended) return;

      const time = video.currentTime;
      if (!captureTimes.has(time)) {
        captureTimes.add(time);

        const maxW = 1920;
        const videoW = video.videoWidth;
        const videoH = video.videoHeight;
        if (videoW > 0 && videoH > 0) {
          const capW = Math.min(videoW, maxW);
          const capH = (videoH * capW) / videoW;

          const frameCanvas = document.createElement("canvas");
          frameCanvas.width = capW;
          frameCanvas.height = capH;
          const ctx = frameCanvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, capW, capH);
            frames.push(frameCanvas);
          }
        }
      }

      if ("requestVideoFrameCallback" in video) {
        // @ts-ignore
        video.requestVideoFrameCallback(captureFrame);
      } else {
        animationId = requestAnimationFrame(captureFrame);
      }
    };

    const handlePlay = () => {
      isCapturing = true;
      if ("requestVideoFrameCallback" in video) {
        // @ts-ignore
        video.requestVideoFrameCallback(captureFrame);
      } else {
        animationId = requestAnimationFrame(captureFrame);
      }
    };

    const handleEnded = () => {
      isCapturing = false;
      if (animationId) cancelAnimationFrame(animationId);

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
      if (animationId) cancelAnimationFrame(animationId);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  const startPlayback = (frames: HTMLCanvasElement[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sample = frames[0];
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

        const currentFrame = frames[frameIndex];
        if (currentFrame) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(currentFrame, 0, 0);
        }

        if (forward) {
          if (frameIndex < frames.length - 1) {
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

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  };

  return (
    <div className="absolute inset-0 z-0 scale-[1.15] origin-top overflow-hidden w-full h-full">
      <video
        ref={videoRef}
        src={VIDEO_URL}
        muted
        playsInline
        autoPlay
        preload="auto"
        crossOrigin="anonymous"
        style={{ display: framesReady ? "none" : "block" }}
        className="w-full h-full object-cover object-top"
      />

      <canvas
        ref={canvasRef}
        style={{ display: framesReady ? "block" : "none" }}
        className="w-full h-full object-cover object-top"
      />
    </div>
  );
}
