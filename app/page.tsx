"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import VideoDownloader from "@/components/VideoDownloader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Box } from "lucide-react";
import { X } from "lucide-react";
import { useState } from "react";
import HPV from "../public/Images/Hypernova_Depth_Icon.svg";
export default function Home() {
  const supportedSite = [
    "Youtube",
    "Vimeo",
    "Dailymotion",
    "Facebook",
    "Twitch",
    "Twitter",
    "X", // Twitter'  s new domain
    "Tiktok",
    "Instagram",
    "Soundcloud",
    "Bilibili",
    "Rumble",
    "Linkedin",
    "Reddit",
    "Bandcamp",
    "Archive",
    "Mixcloud",
    "Ninegag",
    "Ted",
  ];
  const [SupportToggle, setSupportToggle] = useState(false);
  const HandleToggle = () => {
    setSupportToggle(!SupportToggle);
  };

  return (
    <div className="font-sans flex-row">
      <header>
        <div className="relative left-1/2 transform -translate-x-1/2 flex flex-col items-center justify-start p-2 gap-2">
        {/* Toggle Button */}
        <div
          className="flex items-center text-xs gap-2 p-[7px_15px] text-black rounded-[15px] bg-transparent cursor-pointer hover:bg-black/5 transition-all"
          onClick={HandleToggle}
        >
          <X
            size={20}
            style={{
              padding: "5px",
              borderRadius: "15px",
              backgroundColor: "rgba(0, 0, 0, 0.1)",
              transition: "all 0.2s ease-in-out",
              transform: SupportToggle ? "rotate(45deg)" : "rotate(0deg)",
            }}
          />
          Supported Sites
        </div>

        {/* Popup Box */}
        <div
          className={`w-1/4 transition-all duration-300 transform origin-top rounded-lg shadow-md bg-zinc-20 ${
            SupportToggle
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95 pointer-events-none"
          }`}
        >
          <div className="flex flex-wrap justify-center mt-2 p-2">
            {supportedSite.map((site) => (
              <p
                key={site}
                className="text-center text-xs p-2 m-1 rounded bg-neutral-100"
              >
                {site}
              </p>
            ))}
          </div>
          <p className="text-center text-xs p-2 opacity-50">support for a service does not imply affiliation, endorsement, or any form of support other than technical compatibility.</p>
        </div>
      </div>

      </header>
      <main className="flex flex-col gap-[32px] row-start-2 items-center w-full">
        <div className="flex items-center gap-4 justify-center">
          <Image src={HPV} alt="logo" width={100} height={100}/>
          <h1>
            <span className="text-6xl font-bold text-indigo-950" >HYPERNOVA</span><br/><span className="text-2xl font-bold text-amber-950">ONLINE VIDEO DOWNLOADER</span>
          </h1>
        </div>
        {/* Hero Section
        <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance">
          Jxcobie's Online Video Downloader
        </h1>

        <ol className="font-mono list-inside list-decimal text-sm/6 text-center sm:text-left">
          <li className="mb-2 tracking-[-.01em]">
            Get started by entering the url.
          </li>
          <li className="tracking-[-.01em]">
            Choose your format and quality, then click download.
          </li>
        </ol>
        */}
        {/* The component will take up the necessary space */}
        <VideoDownloader />

        {/* Features/Info Card */}
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 p-4 w-full max-w-2xl">
          <div className="text-center">
            <p className="font-bold text-lg text-green-800 dark:text-green-200 mb-2">
              ✨ Features
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-green-700 dark:text-green-300">
              <div>
                <p className="font-medium">🎵 Audio Downloads</p>
                <p className="text-xs opacity-75">
                  High-quality MP3 extraction
                </p>
              </div>
              <div>
                <p className="font-medium">🎬 Video Downloads</p>
                <p className="text-xs opacity-75">MP4, WebM up to 4K quality</p>
              </div>
              <div>
                <p className="font-medium">⚡ Fast & Reliable</p>
                <p className="text-xs opacity-75">Powered by yt-dlp</p>
              </div>
            </div>
          </div>
        </Card>
      </main>
      <footer className="absolute bottom-0 left-0 right-0 text-center text-xs opacity-50 pb-4 mt-4">
            Made with ❤️ by <a href="https://github.com/Jxcobie" target="_blank" rel="noopener noreferrer">Jacob Jaballah</a>
      </footer>
    </div>
  );
}
