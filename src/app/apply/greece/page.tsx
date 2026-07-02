"use client";

import React, { useState } from 'react';

export default function GreeceApplicationForm() {
  const [showWarning, setShowWarning] = useState(true);
  const [photo, setPhoto] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setPhoto(url);
    }
  };

  const questions = [
    "Are you applying voluntarily for employment in Greece?",
    "Are you between 18 and 50 years old?",
    "Do you have a valid passport (minimum 1 years)?",
    "Are you medically fit for labor/hospitality work?",
    "Can you provide a police clearance certificate?",
    "Do you understand jobs may include hotel, cleaning, or labor work?",
    "Are you willing to work shifts and weekends?",
    "Do you understand contract duration is 2 years?",
    "Are you willing to complete full recruitment process (2-3 months)?",
    "Are you ready for interview and screening?",
    "Do you understand documents must be submitted physically after selection?",
    "Are you aware visa processing requires embassy attendance?",
    "Do you understand no advance payment is required?",
    "Do you understand that a $180 work permit tax payment is required after receiving a job offer?",
    "Do you agree to follow official recruitment channels only?",
    "Do you confirm all information provided is correct?"
  ];

  return (
    <>
      {showWarning && (
        <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-[#104F36] px-6 py-4 flex items-center gap-3">
               <span className="text-amber-400 text-2xl">⚠️</span>
               <h2 className="text-white font-bold text-lg tracking-wide">IMPORTANT PREREQUISITES</h2>
            </div>
            <div className="p-6 text-sm text-slate-600 leading-relaxed space-y-4">
              <p className="font-semibold text-slate-800">
                Before you carefully fill out this official application form, please read the mandatory requirements below:
              </p>
              <ul className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                 <li className="flex gap-2">
                    <span className="text-[#1CA36A] font-black">1.</span>
                    <span><strong className="text-slate-800">Account Registration:</strong> You must have successfully created an official account on the Vertex International Recruitment platform.</span>
                 </li>
                 <li className="flex gap-2">
                    <span className="text-[#1CA36A] font-black">2.</span>
                    <span><strong className="text-slate-800">Initial Interview Clearance:</strong> You must have completed and passed the preliminary screening interview with our recruitment team.</span>
                 </li>
              </ul>
              <div className="bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-100">
                If you have not fulfilled these two requirements, submitting this form will result in an <strong>automatic rejection</strong> of your application. Ensure all information provided exactly matches your passport.
              </div>
              <p>To continue to the form, please confirm that you understand these terms and have completed the prerequisites.</p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
               <button 
                 onClick={() => window.history.back()} 
                 className="px-5 py-2 font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
               >
                 Go Back
               </button>
               <button 
                 onClick={() => setShowWarning(false)} 
                 className="px-6 py-2 bg-[#104F36] hover:bg-[#1CA36A] text-white font-bold rounded-lg shadow-md transition-colors"
               >
                 I Understand & Confirm
               </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-100 min-h-screen py-10 px-4 font-sans text-slate-800">
        <div className="max-w-[850px] mx-auto bg-white shadow-xl shadow-slate-200/50 min-h-[1000px] relative p-8 md:p-14 overflow-hidden print:shadow-none print:p-0">
        
        {/* Header Section */}
        <div className="mb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="pt-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-[#104F36] flex flex-col items-center justify-center relative">
                   <span className="absolute -top-3 left-1 text-lg leading-none transform -rotate-12">✓</span>
                   <img src="/logo.svg" alt="Vertex Logo" className="w-[30px] h-[30px] object-contain opacity-80" />
                   <span className="text-[10px] font-bold mt-1 tracking-tighter">vertex</span>
                </div>
                <div className="flex flex-col ml-2">
                   <h1 className="text-[26px] font-bold text-[#104F36] tracking-[0.05em] leading-none mb-1">VERTEX</h1>
                   <p className="text-[11px] font-extrabold text-[#1CA36A] tracking-[0.1em] leading-none">INTERNATIONAL RECRUITMENT</p>
                </div>
              </div>

              <p className="text-slate-500 font-bold tracking-[0.05em] text-[12px] mt-4 mb-2">GREECE HOSPITALITY & LABOR SECTOR 2026</p>
              
              {/* Light Green block */}
              <div className="flex h-5 w-[280px]">
                 <div className="w-[6px] bg-[#1CA36A] h-full" />
                 <div className="flex-1 bg-[#EEF8F3] h-full" />
              </div>
            </div>

            {/* Photo Block */}
            <div className="w-[105px] h-[135px] border-[2px] border-dashed border-[#1CA36A] flex flex-col items-center justify-center relative bg-white">
                {photo ? (
                  <img src={photo} alt="Candidate" className="w-full h-full object-cover z-10" />
                ) : (
                  <p className="text-[10px] font-bold text-[#1CA36A] tracking-wider text-center leading-relaxed">CANDIDATE<br/>PHOTO<br/>(4x6)</p>
                )}
                <input 
                   type="file" 
                   accept="image/*" 
                   onChange={handlePhotoUpload} 
                   className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
                />
            </div>
          </div>
          
          <div className="h-[3px] bg-[#104F36] w-full mt-4" />
        </div>

        {/* Full Name Section */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-2 mb-8 mt-5">
          <label className="font-bold text-[#104F36] whitespace-nowrap text-[13px] tracking-wide">FULL NAME (As per Passport):</label>
          <input type="text" className="flex-1 border-b-[2px] border-[#104F36] focus:outline-none focus:border-[#1CA36A] bg-transparent text-[14px] pb-0.5 px-2 font-bold text-slate-800" />
        </div>

        {/* Section 1 */}
        <div className="mb-8">
           <div className="bg-[#104F36] text-white px-3 py-1.5 font-bold mb-4 flex items-center text-[13px] tracking-wide rounded-sm shadow-sm">
              <div className="w-1.5 h-3.5 bg-[#1CA36A] mr-2"></div>
              SECTION 1: PRE-ASSESSMENT QUESTIONNAIRE
           </div>
           
           <div className="border border-slate-200 rounded-sm overflow-hidden">
             <table className="w-full text-[12.5px] border-collapse">
                <thead>
                  <tr className="bg-[#D3F1E1] text-[#104F36] font-bold text-left border-b-2 border-white">
                    <th className="py-2.5 px-3 w-10 text-center">No.</th>
                    <th className="py-2.5 px-3">Question / Requirement Confirmation</th>
                    <th className="py-2.5 px-1 w-14 text-center">Yes</th>
                    <th className="py-2.5 px-1 w-14 text-center">No</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q, i) => (
                     <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#F3FCF6]"}>
                        <td className="py-2.5 px-3 text-center text-[#104F36] font-bold border-b border-slate-100">{i + 1}</td>
                        <td className="py-2.5 px-3 text-slate-700 border-b border-slate-100 tracking-tight">{q}</td>
                        <td className="py-2.5 px-1 text-center border-b border-slate-100">
                           <input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36] cursor-pointer" />
                        </td>
                        <td className="py-2.5 px-1 text-center border-b border-slate-100 border-r border-transparent">
                           <input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36] cursor-pointer" />
                        </td>
                     </tr>
                  ))}
                </tbody>
             </table>
           </div>
        </div>

        {/* Section 2 */}
        <div className="mb-16 relative">
           <div className="bg-[#104F36] text-white px-3 py-1.5 font-bold mb-6 flex items-center text-[13px] tracking-wide rounded-sm shadow-sm">
              <div className="w-1.5 h-3.5 bg-[#1CA36A] mr-2"></div>
              SECTION 2: PERSONAL INFORMATION
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6 text-[13px]">
             <div className="flex flex-col gap-1 w-full">
               <div className="flex justify-between items-end w-full">
                 <label className="font-bold text-[#104F36]">Date of Birth & Age:</label>
                 <span className="text-[#104F36] text-[11px] font-bold flex items-end">Age: <input type="text" className="w-12 border-b border-slate-400 border-dashed focus:outline-none bg-transparent ml-1 px-1 h-4 text-slate-800" /></span>
               </div>
               <input type="text" className="w-full border-b border-slate-400 border-dashed focus:outline-none focus:border-[#104F36] bg-transparent py-0.5 text-slate-800 font-medium" />
             </div>
             
             <div className="flex flex-col gap-1 w-full relative z-10">
               <label className="font-bold text-[#104F36]">Gender:</label>
               <input type="text" className="w-full border-b border-slate-400 border-dashed focus:outline-none focus:border-[#104F36] bg-transparent py-0.5 mt-[18px] text-slate-800 font-medium" />
             </div>

             <div className="flex flex-col gap-1 w-full">
               <label className="font-bold text-[#104F36]">Nationality:</label>
               <input type="text" className="w-full border-b border-slate-400 border-dashed focus:outline-none focus:border-[#104F36] bg-transparent py-0.5 text-slate-800 font-medium" />
             </div>

             <div className="flex flex-col gap-1 w-full relative z-10 bg-white/50">
               <label className="font-bold text-[#104F36]">Current Address:</label>
               <input type="text" className="w-full border-b border-slate-400 border-dashed focus:outline-none focus:border-[#104F36] bg-transparent py-0.5 text-slate-800 font-medium" />
             </div>

             <div className="flex flex-col gap-1 w-full">
               <label className="font-bold text-[#104F36]">Phone (WhatsApp):</label>
               <input type="text" className="w-full border-b border-slate-400 border-dashed focus:outline-none focus:border-[#104F36] bg-transparent py-0.5 text-slate-800 font-medium" />
             </div>

             <div className="flex flex-col gap-1 w-full relative z-10 bg-white/50">
               <label className="font-bold text-[#104F36]">Email Address:</label>
               <input type="email" className="w-full border-b border-slate-400 border-dashed focus:outline-none focus:border-[#104F36] bg-transparent py-0.5 text-slate-800 font-medium" />
             </div>

             <div className="flex flex-col gap-1 w-full">
               <label className="font-bold text-[#104F36]">Passport No:</label>
               <input type="text" className="w-full border-b border-slate-400 border-dashed focus:outline-none focus:border-[#104F36] bg-transparent py-0.5 text-slate-800 font-medium" />
             </div>

             <div className="flex flex-col gap-1 w-full z-10">
               <label className="font-bold text-[#104F36]">Passport Expiry Date:</label>
               <input type="text" className="w-full border-b border-slate-400 border-dashed focus:outline-none focus:border-[#104F36] bg-transparent py-0.5 text-slate-800 font-medium" />
             </div>
           </div>

           {/* Stamp Effect (Visual) */}
           <div className="absolute right-0 bottom-10 rotate-[-12deg] opacity-90 pointer-events-none z-0">
              <div className="border-[2px] border-slate-800 p-2 transform w-[170px] text-center rounded-[4px] relative bg-transparent flex flex-col items-center">
                 <div className="absolute -left-6 top-6 text-3xl font-black text-slate-800 z-10 transform rotate-12">✓</div>
                 <p className="font-extrabold text-[10px] text-slate-800 leading-[1.2] border-b-[2px] border-slate-800 pb-1 mb-1 mt-1 tracking-tighter">VERTEX INTERNATIONAL<br/>RECRUITMENT</p>
                 <p className="text-[10px] font-black leading-none mb-1 text-slate-800">★</p>
                 <p className="text-[8px] font-extrabold text-slate-800 leading-[1.3] tracking-tighter">+44 7424 934006<br/>5 Brayford Square London<br/>E1 0SG United Kingdom</p>
              </div>
           </div>
        </div>
        
        {/* Action Button */}
        <div className="mt-8 flex justify-center no-print">
            <button 
              className="bg-[#104F36] hover:bg-[#1CA36A] text-white font-bold py-3 px-12 rounded-full shadow-lg shadow-[#104F36]/30 transition-all text-sm tracking-wide"
              onClick={() => alert('Application submitted successfully!')}
            >
              Submit Questionnaire
            </button>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              .no-print { display: none; }
              body { background-color: white !important; }
              .shadow-xl { box-shadow: none !important; }
            }
        `}} />
      </div>
    </div>
    </>
  );
}
