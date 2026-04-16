"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Trash2, FileText, Image, File, ExternalLink, X, FolderOpen, Search } from "lucide-react";

interface UploadedFile {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  category: string;
  description?: string;
  createdAt: string;
}

const CATEGORIES = [
  { value: "general", label: "כללי", emoji: "📁" },
  { value: "goals", label: "מטרות", emoji: "🎯" },
  { value: "health", label: "בריאות", emoji: "🏥" },
  { value: "learning", label: "למידה", emoji: "📚" },
  { value: "fitness", label: "כושר", emoji: "💪" },
  { value: "inspiration", label: "השראה", emoji: "✨" },
  { value: "notes", label: "הערות", emoji: "📝" },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image size={20} className="text-blue-400" />;
  if (mimeType === "application/pdf") return <FileText size={20} className="text-red-400" />;
  return <File size={20} className="text-gray-400" />;
}

export default function FilesPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({ category: "general", description: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    const res = await fetch("/api/files");
    const data = await res.json();
    setFiles(data);
  };

  useEffect(() => { fetchFiles(); }, []);

  const uploadFile = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("category", uploadForm.category);
    formData.append("description", uploadForm.description);

    try {
      await fetch("/api/files", { method: "POST", body: formData });
      setSelectedFile(null);
      setShowUploadForm(false);
      setUploadForm({ category: "general", description: "" });
      fetchFiles();
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (id: string) => {
    if (!confirm("למחוק את הקובץ?")) return;
    await fetch(`/api/files/${id}`, { method: "DELETE" });
    fetchFiles();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setShowUploadForm(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowUploadForm(true);
    }
  };

  const filtered = files.filter((f) => {
    const matchCat = filterCategory === "all" || f.category === filterCategory;
    const matchSearch = !search || f.originalName.toLowerCase().includes(search.toLowerCase()) || f.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">הקבצים שלי</h1>
          <p className="text-gray-400 text-sm mt-1">{files.length} קבצים שמורים</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Upload size={16} />
          העלה קובץ
        </button>
      </div>

      {/* Upload modal */}
      {showUploadForm && selectedFile && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-700 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">העלאת קובץ</h2>
              <button onClick={() => { setShowUploadForm(false); setSelectedFile(null); }} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* File preview */}
            <div className="glass rounded-xl p-4 mb-4 flex items-center gap-3">
              {getFileIcon(selectedFile.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-400">{formatSize(selectedFile.size)}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">קטגוריה</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setUploadForm({ ...uploadForm, category: cat.value })}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${uploadForm.category === cat.value ? "bg-amber-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">תיאור</label>
                <input
                  type="text"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="תיאור הקובץ..."
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-600 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowUploadForm(false); setSelectedFile(null); }} className="flex-1 bg-gray-800 text-gray-300 rounded-xl py-3 text-sm font-medium hover:bg-gray-700">
                  ביטול
                </button>
                <button onClick={uploadFile} disabled={uploading} className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-medium">
                  {uploading ? "מעלה..." : "העלה"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.csv,.mp3,.mp4" />

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all mb-6 ${dragOver ? "border-amber-500 bg-amber-500/10" : "border-gray-700 hover:border-gray-600 hover:bg-gray-800/50"}`}
      >
        <Upload size={32} className={`mx-auto mb-3 ${dragOver ? "text-amber-400" : "text-gray-600"}`} />
        <p className={`font-medium ${dragOver ? "text-amber-400" : "text-gray-400"}`}>
          {dragOver ? "שחרר כאן..." : "גרור קבצים לכאן או לחץ להעלאה"}
        </p>
        <p className="text-xs text-gray-600 mt-1">תמונות, PDF, מסמכים, וידאו ועוד</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חפש קבצים..."
            className="w-full bg-gray-800 text-white rounded-xl pr-10 pl-4 py-2.5 text-sm border border-gray-700 focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${filterCategory === "all" ? "bg-amber-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
          >
            הכל
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilterCategory(cat.value)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${filterCategory === cat.value ? "bg-amber-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
            >
              {cat.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16">
          <FolderOpen size={48} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">{search ? "לא נמצאו קבצים" : "אין קבצים עדיין"}</p>
          {!search && <p className="text-gray-600 text-sm">העלה קבצים, תמונות, ומסמכים לפיתוח האישי שלך</p>}
        </div>
      )}

      {/* Files grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((file) => {
          const cat = CATEGORIES.find((c) => c.value === file.category);
          const isImage = file.mimeType.startsWith("image/");

          return (
            <div key={file.id} className="glass rounded-2xl overflow-hidden hover:bg-white/[0.06] transition-all group">
              {/* Image preview */}
              {isImage && (
                <div className="h-36 bg-gray-800 overflow-hidden">
                  <img src={file.path} alt={file.originalName} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {!isImage && getFileIcon(file.mimeType)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{file.originalName}</p>
                      <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <a href={file.path} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-gray-700 transition-colors">
                      <ExternalLink size={14} />
                    </a>
                    <button onClick={() => deleteFile(file.id)} className="text-gray-500 hover:text-red-400 p-1 rounded-lg hover:bg-gray-700 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {file.description && (
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{file.description}</p>
                )}

                <div className="flex items-center justify-between mt-3">
                  {cat && (
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                      {cat.emoji} {cat.label}
                    </span>
                  )}
                  <span className="text-xs text-gray-600">
                    {new Date(file.createdAt).toLocaleDateString("he-IL")}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
