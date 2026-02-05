"use client";
import { useState } from "react";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth";

export default function KYCPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState({ govtId: null as File | null, businessLicense: null as File | null, bankDetails: null as File | null });
  const [formData, setFormData] = useState({ bankAccount: "", ifscCode: "" });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) setFiles({ ...files, [field]: file });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      if (files.govtId) data.append("govtId", files.govtId);
      if (files.businessLicense) data.append("businessLicense", files.businessLicense);
      if (files.bankDetails) data.append("bankDetails", files.bankDetails);
      data.append("bankAccount", formData.bankAccount);
      data.append("ifscCode", formData.ifscCode);
      await apiClient.post("/seller-kyc/submit", data, { headers: { "Content-Type": "multipart/form-data" } });
      alert("KYC submitted successfully!");
    } catch (e: any) {
      alert("Error: " + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== "seller") return <div className="p-8 text-red-600">Seller only</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-green-600">KYC Verification Form</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Government ID</label>
          <input type="file" onChange={(e) => handleFileChange(e, "govtId")} required className="border w-full p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Business License</label>
          <input type="file" onChange={(e) => handleFileChange(e, "businessLicense")} required className="border w-full p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Bank Account Number</label>
          <input type="text" value={formData.bankAccount} onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })} required className="border w-full p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">IFSC Code</label>
          <input type="text" value={formData.ifscCode} onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })} required className="border w-full p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Bank Details PDF</label>
          <input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, "bankDetails")} required className="border w-full p-2 rounded" />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded">{loading ? "Submitting..." : "Submit KYC"}</button>
      </form>
    </div>
  );
}
