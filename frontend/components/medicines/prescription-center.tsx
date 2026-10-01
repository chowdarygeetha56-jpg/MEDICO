"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { FileCheck2, FileText, ImagePlus, LoaderCircle, RotateCcw, Trash2, Upload } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import AuthGate from "@/components/auth/auth-gate";
import { useConvexReady } from "@/components/providers/convex-provider";

const acceptedTypes = ["image/jpeg", "image/png", "application/pdf"];
const maxFileSize = 10 * 1024 * 1024;

export default function PrescriptionCenter() {
  const ready = useConvexReady();
  return ready ? <AuthGate><ConnectedPrescriptionCenter /></AuthGate> : (
    <main className="prescription-page"><div className="preview-setup"><strong>Prescription storage is not connected</strong><span>Connect Convex Auth and Convex Storage to upload or review private prescription files.</span></div></main>
  );
}

function ConnectedPrescriptionCenter() {
  const prescriptions = useQuery(api.prescriptions.mine, {});
  const generateUploadUrl = useMutation(api.prescriptions.generateUploadUrl);
  const createPrescription = useMutation(api.prescriptions.create);
  const removePrescription = useMutation(api.prescriptions.remove);
  const [selection, setSelection] = useState<{ file: File; previewUrl: string } | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!selection) return;
    return () => URL.revokeObjectURL(selection.previewUrl);
  }, [selection]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = "";
    setMessage("");
    if (!selected) {
      setSelection(null);
      return;
    }
    if (!acceptedTypes.includes(selected.type)) {
      setSelection(null);
      setMessage("Choose a JPG, PNG, or PDF prescription.");
      return;
    }
    if (selected.size > maxFileSize) {
      setSelection(null);
      setMessage("Prescription files must be 10 MB or smaller.");
      return;
    }
    setSelection({ file: selected, previewUrl: URL.createObjectURL(selected) });
  }

  async function upload() {
    if (!selection) return;
    const { file } = selection;
    setPending(true);
    setMessage("");
    try {
      const uploadUrl = await generateUploadUrl({});
      const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!response.ok) throw new Error("The secure upload did not complete. Please try again.");
      const { storageId } = await response.json() as { storageId: Id<"_storage"> };
      await createPrescription({ storageId, fileName: file.name });
      setSelection(null);
      setMessage("Prescription submitted for review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload your prescription.");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: Id<"prescriptions">) {
    setPending(true);
    setMessage("");
    try {
      await removePrescription({ id });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove this prescription.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="prescription-page">
      <header className="catalog-heading"><p className="eyebrow"><span className="eyebrow__dot" /> Private document storage</p><h1>Your prescriptions</h1><p>Prescription-required medicines cannot be fulfilled until the submitted document has been reviewed and approved.</p></header>
      <section className="upload-panel" aria-labelledby="upload-heading">
        <div className="upload-panel__heading"><ImagePlus size={22} /><div><h2 id="upload-heading">Add a prescription</h2><p>JPG, PNG, or PDF · up to 10 MB</p></div></div>
        {!selection ? <label className="upload-dropzone"><Upload size={22} /><strong>Select a file</strong><span>Choose a clear photo or PDF of your prescription.</span><input type="file" accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf" onChange={chooseFile} /></label> : (
          <div className="file-preview">
            {selection.file.type === "application/pdf" ? <iframe title={`Preview of ${selection.file.name}`} src={selection.previewUrl} /> : <Image src={selection.previewUrl} alt={`Preview of ${selection.file.name}`} width={680} height={480} unoptimized />}
            <div className="file-preview__details"><FileText size={17} /><span>{selection.file.name}</span><button className="icon-button" type="button" aria-label="Remove selected file" onClick={() => setSelection(null)}><Trash2 size={16} /></button></div>
          </div>
        )}
        {message && <p className="form-message" role="status">{message}</p>}
        {selection && <button className="button button--primary" type="button" disabled={pending} onClick={() => void upload()}>{pending ? <LoaderCircle className="spin" size={17} /> : <FileCheck2 size={17} />}{pending ? "Uploading securely..." : "Submit for review"}</button>}
      </section>
      <section className="prescription-list" aria-labelledby="prescription-list-heading">
        <div className="section-heading"><h2 id="prescription-list-heading">Submission history</h2><button className="icon-button" type="button" aria-label="Refresh prescription history" onClick={() => window.location.reload()}><RotateCcw size={16} /></button></div>
        {prescriptions === undefined ? <p>Loading submissions...</p> : prescriptions.length === 0 ? <div className="empty-panel"><strong>No prescriptions submitted.</strong><p>Files are stored securely in Convex Storage once submitted.</p></div> : prescriptions.map((item) => (
          <article className="prescription-row" key={item._id}>
            <FileText size={19} /><div><strong>{item.fileName}</strong><span>{new Date(item.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })} · {(item.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>{item.reviewNote && <p>{item.reviewNote}</p>}</div>
            <span className={`status-pill status-pill--${item.status}`}>{item.status.replaceAll("_", " ")}</span>
            {item.status === "pending" && <button className="icon-button" type="button" aria-label={`Remove ${item.fileName}`} disabled={pending} onClick={() => void remove(item._id)}><Trash2 size={15} /></button>}
          </article>
        ))}
      </section>
      <p className="medical-disclaimer">Only upload a valid prescription issued to you by a licensed healthcare professional. Uploaded files are private to your account and designated reviewers.</p>
    </main>
  );
}