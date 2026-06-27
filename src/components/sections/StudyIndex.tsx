"use client";

import { useState } from "react";

interface Study {
  id: number;
  title: string;
  author: string;
  publicationType: string;
  date: string;
  description: string;
}

// Add studies here later
const STUDIES: Study[] = [];

const PUBLICATION_TYPES = ["All", "Clinical Trial", "Observational", "Review"];

export default function StudiesArchive() {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [publicationType, setPublicationType] = useState("All");
  const [author, setAuthor] = useState("");
  const [sortBy, setSortBy] = useState("More Recent");

  const filtered = STUDIES.filter((study) => {
    const matchesSearch =
      study.title.toLowerCase().includes(search.toLowerCase()) ||
      study.description.toLowerCase().includes(search.toLowerCase());
    const matchesAuthor = author
      ? study.author.toLowerCase().includes(author.toLowerCase())
      : true;
    const matchesType =
      publicationType === "All" || study.publicationType === publicationType;
    return matchesSearch && matchesAuthor && matchesType;
  }).sort((a, b) => {
    if (sortBy === "More Recent") return b.id - a.id;
    return a.id - b.id;
  });

  return (
    <section
      style={{
        backgroundColor: "white",
        minHeight: "100vh",
        padding: "60px 45px",
        display: "flex",
        gap: "24px",
        alignItems: "flex-start",
      }}
    >
      {/* Filters sidebar */}
      <div
        style={{
          backgroundColor: "#f0f0f0",
          borderRadius: "20px",
          padding: "24px",
          width: "220px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "20px",
            fontWeight: 700,
            color: "#0c0c48",
            margin: 0,
          }}
        >
          Filters
        </h2>

        {/* Date Range */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "11px",
              fontWeight: 600,
              color: "#6b7280",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Date Range
          </label>
          <input
            type="text"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            placeholder="e.g. 2020–2024"
            style={{
              border: "none",
              borderRadius: "8px",
              padding: "8px 12px",
              fontSize: "14px",
              fontFamily: "var(--font-inter), sans-serif",
              backgroundColor: "white",
              color: "#0c0c48",
              outline: "none",
            }}
          />
        </div>

        {/* Publication Type */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "11px",
              fontWeight: 600,
              color: "#6b7280",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Publication Type
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {PUBLICATION_TYPES.map((type) => (
              <label
                key={type}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "14px",
                  color: "#374151",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="publicationType"
                  value={type}
                  checked={publicationType === type}
                  onChange={() => setPublicationType(type)}
                  style={{ accentColor: "#0c0c48" }}
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        {/* Author */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "11px",
              fontWeight: 600,
              color: "#6b7280",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Author
          </label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Search author"
            style={{
              border: "none",
              borderRadius: "8px",
              padding: "8px 12px",
              fontSize: "14px",
              fontFamily: "var(--font-inter), sans-serif",
              backgroundColor: "white",
              color: "#0c0c48",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          backgroundColor: "white",
          borderRadius: "20px",
          boxShadow: "0 0 30px rgba(0,0,0,0.10)",
          padding: "40px",
          minHeight: "600px",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "36px",
            fontWeight: 800,
            color: "#0c0c48",
            margin: "0 0 4px 0",
          }}
        >
          Archive Index
        </h1>
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "16px",
            color: "#9ca3af",
            margin: "0 0 28px 0",
          }}
        >
          Browse our published research
        </p>

        {/* Search + Sort */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              border: "1.5px solid #e5e7eb",
              borderRadius: "9999px",
              padding: "10px 20px",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search publication"
              style={{
                border: "none",
                outline: "none",
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "16px",
                color: "#374151",
                backgroundColor: "transparent",
                width: "100%",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "13px",
                fontWeight: 600,
                color: "#9ca3af",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Sort By
            </span>
            <div style={{ position: "relative" }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  appearance: "none",
                  border: "1.5px solid #e5e7eb",
                  borderRadius: "9999px",
                  padding: "8px 36px 8px 16px",
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "14px",
                  color: "#6b7280",
                  backgroundColor: "white",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option>More Recent</option>
                <option>Oldest First</option>
              </select>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "16px", color: "#9ca3af", textAlign: "center", marginTop: "60px" }}>
            No studies found.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {filtered.map((study) => (
              <div
                key={study.id}
                style={{
                  border: "1.5px solid #e5e7eb",
                  borderRadius: "12px",
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <h3 style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "18px", fontWeight: 700, color: "#0c0c48", margin: 0 }}>
                  {study.title}
                </h3>
                <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "14px", color: "#6b7280", margin: 0 }}>
                  {study.author} · {study.date} · {study.publicationType}
                </p>
                <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "15px", color: "#374151", margin: 0 }}>
                  {study.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}