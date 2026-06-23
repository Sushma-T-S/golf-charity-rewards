"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../supabase/client";

export default function ProofPage() {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFiles();
  }, []);

  async function loadFiles() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setFiles([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase.storage.from("proofs").list(user.id, {
      limit: 50,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });

    const urls =
      data?.map((file) => {
        return supabase.storage
          .from("proofs")
          .getPublicUrl(`${user.id}/${file.name}`).data.publicUrl;
      }) || [];

    setFiles(urls);
    setLoading(false);
  }

  async function uploadProof() {
    if (!selectedFile) {
      alert("Select a file first.");
      return;
    }

    setUploading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please log in first.");
      setUploading(false);
      return;
    }

    const filePath = `${user.id}/${Date.now()}_${selectedFile.name}`;
    const { error } = await supabase.storage
      .from("proofs")
      .upload(filePath, selectedFile);

    if (error) {
      alert(error.message);
    } else {
      setSelectedFile(null);
      await loadFiles();
      alert("Proof uploaded successfully.");
    }

    setUploading(false);
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">Proof Upload 📸</h1>
      <p className="mt-2 text-slate-600">Upload evidence for wins and keep your proof files organized.</p>

      <div className="mt-6 max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <input
          type="file"
          onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-600"
        />
        <button
          onClick={uploadProof}
          disabled={uploading || !selectedFile}
          className="mt-4 rounded-full bg-slate-900 px-5 py-3 text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload proof file"}
        </button>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold">Uploaded proofs</h2>
        {loading ? (
          <p className="mt-3 text-slate-600">Loading proof files…</p>
        ) : files.length === 0 ? (
          <p className="mt-3 text-slate-600">No proof files uploaded yet.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((url, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <img src={url} alt={`proof-${index}`} className="h-40 w-full object-cover rounded" />
                <a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-slate-700 underline">
                  View file
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
