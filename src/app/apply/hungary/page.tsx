"use client";

import React, { useState, useRef, useEffect } from 'react';

export default function HungaryApplicationForm() {
  const [showWarning, setShowWarning] = useState(true);
  const [photo, setPhoto] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setPhoto(url);
    }
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set proper internal resolution
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(2, 2);

    const preventScroll = (e: TouchEvent) => e.preventDefault();
    canvas.addEventListener('touchstart', preventScroll, { passive: false });
    canvas.addEventListener('touchmove', preventScroll, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', preventScroll);
      canvas.removeEventListener('touchmove', preventScroll);
    };
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d')?.beginPath();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    } else return;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0F172A';

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const questions = [
    "Are you applying voluntarily for employment in Hungary?",
    "Are you between 18 and 50 years old?",
    "Do you have a valid passport with at least 1 years validity?",
    "Are you medically fit for factory or labor work?",
    "Can you provide a police clearance certificate?",
    "Do you understand the job involves factory/industrial work?",
    "Are you willing to work shifts (8–12 hours, 5–6 days/week)?",
    "Do you understand the contract duration is 2 years?",
    "Are you willing to complete the full recruitment process (2-3 months)?",
    "Are you willing to attend interview (phone/online)?",
    "Are you aware that document verification is mandatory?",
    "Do you understand visa and travel are covered by the company?",
    "Do you understand no advance payment is required?",
    "Do you understand that a $180 work permit tax payment is required after receiving a job offer?",
    "Are you willing to submit documents via DHL after selection?",
    "Do you agree to provide accurate and truthful information?"
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

              <p className="text-slate-500 font-bold tracking-[0.05em] text-[12px] mt-4 mb-2">HUNGARY INDUSTRIAL & FACTORY SECTOR 2026</p>
              
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
        
        </div>
        
        {/* PAGE 2 */}
        <div className="max-w-[850px] mx-auto bg-white shadow-xl shadow-slate-200/50 min-h-[1000px] relative p-8 md:p-14 mt-10 overflow-hidden print:shadow-none print:p-0 print:mt-0 print:break-before-page">
          
          {/* SECTION 3: JOB INTEREST & CATEGORY */}
          <div className="mb-6">
             <div className="bg-[#104F36] text-white px-3 py-1.5 font-bold mb-4 flex items-center text-[13px] tracking-wide rounded-sm shadow-sm">
                <div className="w-1.5 h-3.5 bg-[#1CA36A] mr-2"></div>
                SECTION 3: JOB INTEREST & CATEGORY
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#EEF8F3] p-4 rounded-sm border border-[#1CA36A]/20">
                   <h3 className="font-bold text-[#104F36] mb-3 text-[13px]">Preferred Job Sector (Select one):</h3>
                   <div className="space-y-2 text-[13px]">
                     {['Hotel Staff', 'Cleaning Services', 'Kitchen Assistant', 'General Labor'].map(job => (
                        <label key={job} className="flex items-center gap-2 cursor-pointer">
                           <input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36]" /> {job}
                        </label>
                     ))}
                   </div>
                </div>
                <div className="bg-[#EEF8F3] p-4 rounded-sm border border-[#1CA36A]/20">
                   <h3 className="font-bold text-[#104F36] mb-3 text-[13px]">Reason for Interest:</h3>
                   <div className="space-y-2 text-[13px]">
                     {['Income opportunity', 'Work abroad experience', 'Career development'].map(r => (
                        <label key={r} className="flex items-center gap-2 cursor-pointer">
                           <input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36]" /> {r}
                        </label>
                     ))}
                     <label className="flex items-center gap-2 cursor-pointer mt-2 pt-1 border-t border-[#1CA36A]/20">
                        <input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36] mt-0.5" /> 
                        <span className="shrink-0">Other:</span>
                        <input type="text" className="w-full bg-transparent border-b border-slate-400 border-dashed focus:outline-none focus:border-[#104F36]" />
                     </label>
                   </div>
                </div>
             </div>
          </div>

          {/* SECTION 4: EDUCATION & EXPERIENCE */}
          <div className="mb-6">
             <div className="bg-[#104F36] text-white px-3 py-1.5 font-bold mb-4 flex items-center text-[13px] tracking-wide rounded-sm shadow-sm">
                <div className="w-1.5 h-3.5 bg-[#1CA36A] mr-2"></div>
                SECTION 4: EDUCATION & EXPERIENCE
             </div>
             <div className="border border-slate-200 rounded-sm p-4 text-[13px]">
                 <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-4 border-b border-slate-100 pb-4">
                    <span className="font-bold text-[#104F36]">Highest Education Level:</span>
                    {['Primary', 'Secondary', 'Diploma', 'Degree'].map(ed => (
                        <label key={ed} className="flex items-center gap-1.5 cursor-pointer">
                           <input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36]" /> {ed}
                        </label>
                    ))}
                 </div>
                 <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                    <div className="flex items-center gap-4">
                       <span className="font-bold text-[#104F36]">Relevant<br/>experience?</span>
                       <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36]" /> No
                       </label>
                       <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36]" /> Yes
                       </label>
                       <span className="text-slate-500 whitespace-nowrap -ml-2">(Years: <input type="text" className="w-8 border-b border-slate-400 focus:outline-none px-1 text-slate-800" />)</span>
                    </div>
                    <div className="flex items-center gap-4">
                       <span className="font-bold text-[#104F36]">Experience<br/>Area:</span>
                       {['Hospitality', 'Cleaning', 'Labor', 'Other'].map(ar => (
                          <label key={ar} className="flex items-center gap-1.5 cursor-pointer">
                             <input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36]" /> {ar}
                          </label>
                       ))}
                    </div>
                 </div>
             </div>
          </div>

          {/* SECTION 5 */}
          <div className="mb-6">
             <div className="bg-[#104F36] text-white px-3 py-1.5 font-bold mb-4 flex items-center text-[13px] tracking-wide rounded-sm shadow-sm">
                <div className="w-1.5 h-3.5 bg-[#1CA36A] mr-2"></div>
                SECTION 5: AWARENESS ASSESSMENT
             </div>
             <div className="border border-slate-200 rounded-sm overflow-hidden">
               <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="bg-[#D3F1E1] text-[#104F36] font-bold text-left border-b-2 border-white">
                      <th className="py-2.5 px-3">Question</th>
                      <th className="py-2.5 px-3">Options</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                       <td className="py-2.5 px-3 text-slate-700 border-b border-slate-100 font-medium">Knowledge about Hungary work environment</td>
                       <td className="py-2.5 px-3 border-b border-slate-100">
                          <div className="flex gap-4">
                             <label className="flex items-center gap-1.5"><input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36]" /> Low</label>
                             <label className="flex items-center gap-1.5"><input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36]" /> Medium</label>
                             <label className="flex items-center gap-1.5"><input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36]" /> High</label>
                          </div>
                       </td>
                    </tr>
                    <tr className="bg-[#F3FCF6]">
                       <td className="py-2.5 px-3 text-slate-700 border-b border-slate-100 font-medium">Understanding of job roles</td>
                       <td className="py-2.5 px-3 border-b border-slate-100">
                          <div className="flex gap-4">
                             <label className="flex items-center gap-1.5"><input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36]" /> Low</label>
                             <label className="flex items-center gap-1.5"><input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36]" /> Medium</label>
                             <label className="flex items-center gap-1.5"><input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36]" /> High</label>
                          </div>
                       </td>
                    </tr>
                    <tr className="bg-white">
                       <td className="py-2.5 px-3 text-slate-700 border-b border-slate-100 font-medium">Awareness of recruitment stages</td>
                       <td className="py-2.5 px-3 border-b border-slate-100">
                          <div className="flex gap-4">
                             <label className="flex items-center gap-1.5"><input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36]" /> Yes</label>
                             <label className="flex items-center gap-1.5"><input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36]" /> No</label>
                          </div>
                       </td>
                    </tr>
                    <tr className="bg-[#F3FCF6]">
                       <td className="py-2.5 px-3 text-slate-700 border-b border-slate-100 font-medium">Awareness of fraud policy</td>
                       <td className="py-2.5 px-3 border-b border-slate-100">
                          <div className="flex gap-4">
                             <label className="flex items-center gap-1.5"><input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36]" /> Yes</label>
                             <label className="flex items-center gap-1.5"><input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36]" /> No</label>
                          </div>
                       </td>
                    </tr>
                  </tbody>
               </table>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
             {/* SECTION 6 */}
             <div>
               <div className="bg-[#104F36] text-white px-3 py-1.5 font-bold mb-4 flex items-center text-[13px] tracking-wide rounded-sm shadow-sm">
                  <div className="w-1.5 h-6 bg-[#1CA36A] mr-2"></div>
                  SECTION 6: HEALTH & <br/> BACKGROUND
               </div>
               <div className="bg-[#EEF8F3] p-4 rounded-sm border border-[#1CA36A]/20 space-y-4 text-[13px]">
                  <div className="flex items-center justify-between">
                     <span className="font-bold text-[#104F36]">Any medical<br/>condition?</span>
                     <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5"><input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36]" /> No</label>
                        <label className="flex items-center gap-1.5"><input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36]" /> Yes</label>
                     </div>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className="font-bold text-[#104F36]">Any criminal<br/>record?</span>
                     <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5"><input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36]" /> No</label>
                        <label className="flex items-center gap-1.5"><input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36]" /> Yes</label>
                     </div>
                  </div>
               </div>
             </div>

             {/* SECTION 7 */}
             <div>
               <div className="bg-[#104F36] text-white px-3 py-1.5 font-bold mb-4 flex items-center text-[13px] tracking-wide rounded-sm shadow-sm">
                  <div className="w-1.5 h-3.5 bg-[#1CA36A] mr-2"></div>
                  SECTION 7: DOCUMENT CONFIRMATION
               </div>
               <div className="border border-slate-200 rounded-sm overflow-hidden h-[120px]">
                 <table className="w-full text-[13px] border-collapse bg-white">
                    <thead>
                      <tr className="bg-[#D3F1E1] text-[#104F36] font-bold text-left border-b-2 border-white">
                        <th className="py-2 px-3">Document</th>
                        <th className="py-2 px-1 w-10 text-center">Yes</th>
                        <th className="py-2 px-1 w-10 text-center">No</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['Valid Passport', 'CV/Resume', 'Passport Photos'].map((doc, idx) => (
                        <tr key={doc} className={idx % 2 === 0 ? "bg-white" : "bg-[#F3FCF6]"}>
                           <td className="py-1.5 px-3 font-medium text-slate-700">{doc}</td>
                           <td className="py-1.5 px-1 text-center"><input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36]" /></td>
                           <td className="py-1.5 px-1 text-center"><input type="checkbox" className="w-[15px] h-[15px] accent-[#104F36]" /></td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
             </div>
          </div>

          {/* APPLICANT DECLARATION & SIGNATURE */}
          <div className="border-[2px] border-[#1CA36A] p-6 rounded-sm relative bg-[#EEF8F3]/30">
            <h3 className="font-bold text-[#104F36] text-[13px] tracking-wide mb-3">APPLICANT DECLARATION</h3>
            <p className="text-[11px] text-slate-700 leading-relaxed mb-10 text-justify">
              I hereby confirm that all information provided in this application form is true and accurate to the best of my knowledge. I understand that any false statement or omission of facts will result in immediate disqualification from the recruitment process. I fully understand the job conditions, salary structure, and the requirement for the work permit tax as explained in Section 1, Point 14.
            </p>
            
            <div className="flex justify-between items-end pb-2">
               <div className="text-center w-64 relative">
                  {/* Signature UI */}
                  <div className="text-left mb-2 no-print">
                      <p className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1.5 rounded flex items-start gap-1.5 leading-tight">
                         <span className="text-emerald-500 text-xs shrink-0 mt-px">✏️</span>
                         <span><strong>How to sign:</strong> Draw your signature inside the white box below using your <strong>mouse pointer</strong> or <strong>finger/touchscreen</strong>.</span>
                      </p>
                  </div>
                  <div className="relative mb-1">
                    <canvas 
                      ref={canvasRef}
                      onMouseDown={startDrawing}
                      onMouseUp={stopDrawing}
                      onMouseOut={stopDrawing}
                      onMouseMove={draw}
                      onTouchStart={startDrawing}
                      onTouchEnd={stopDrawing}
                      onTouchCancel={stopDrawing}
                      onTouchMove={draw}
                      className="w-full h-24 border border-slate-300 rounded bg-white cursor-crosshair touch-none"
                    />
                    <button type="button" onClick={clearSignature} className="absolute top-1 right-1 text-[10px] bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors no-print">Clear</button>
                  </div>
                  <div className="border-t-[1.5px] border-[#104F36] pt-1 mt-1">
                    <span className="text-[10px] font-bold text-[#104F36] uppercase">CANDIDATE SIGNATURE</span>
                  </div>
               </div>

               <div className="text-center w-48">
                  <div className="h-10 mb-1 flex items-end justify-center">
                     <span className="text-slate-800 text-[13px] font-bold pb-1">{new Date().toLocaleDateString('en-GB')}</span>
                  </div>
                  <div className="border-t-[1.5px] border-[#104F36] pt-1">
                    <span className="text-[10px] font-bold text-[#104F36] uppercase">DATE OF APPLICATION</span>
                  </div>
               </div>
            </div>

            {/* Stamp Effect (Visual) */}
            <div className="absolute right-4 top-24 rotate-[-12deg] opacity-70 pointer-events-none">
               <div className="border-[2px] border-slate-800 p-2 transform w-[170px] text-center rounded-[4px] relative bg-transparent flex flex-col items-center">
                  <p className="font-extrabold text-[10px] text-slate-800 leading-[1.2] border-b-[2px] border-slate-800 pb-1 mb-1 tracking-tighter">VERTEX INTERNATIONAL<br/>RECRUITMENT</p>
                  <p className="text-[8px] font-black leading-none mb-1 text-slate-800">★</p>
                  <p className="text-[7px] font-extrabold text-slate-800 leading-[1.3] tracking-tighter">+44 7424 934006<br/>5 Brayford Square London<br/>E1 0SG United Kingdom</p>
               </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-[9px] text-slate-400 mt-12 font-bold w-full uppercase">
             <div className="flex flex-col">
               <span className="text-slate-600 mb-0.5">Vertex International Recruitment Office</span>
               <span>Official Partner for Hungarian Industrial Enterprises 2026</span>
             </div>
             <div className="flex items-center gap-8">
               <span>Application Serial: ___________________</span>
               <span>Page 2 of 2</span>
             </div>
          </div>
        </div>

        {/* Global Action Button placed at the very bottom */}
        <div className="max-w-[850px] mx-auto mt-10 mb-12 flex justify-end no-print">
            <button 
              className="bg-[#104F36] hover:bg-[#1CA36A] text-white font-black py-4 px-12 rounded-lg shadow-xl shadow-[#104F36]/30 transition-all tracking-wide uppercase flex items-center gap-2 hover:scale-105 active:scale-95"
              onClick={() => alert('Full Application Signed and Submitted Successfully!')}
            >
              Submit Signed Application <span className="text-xl leading-none">→</span>
            </button>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              .no-print { display: none !important; }
              body { background-color: white !important; }
              .shadow-xl { box-shadow: none !important; }
            }
        `}} />
      </div>
    </>
  );
}
