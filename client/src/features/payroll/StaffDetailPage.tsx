import { memo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  FileText,
  Phone,
  Mail,
  Printer,
  X,
  Plus,
} from 'lucide-react';
import { getStaffDetail, recordPayment, giveAdvance } from '../../api/payrollApi';
import { StaffMember, SalaryPaymentRecord } from '../../api/types';

const formatINR = (val: number) => '₹ ' + val.toLocaleString('en-IN');

function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isAdvModalOpen, setIsAdvModalOpen] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<SalaryPaymentRecord | null>(null);

  const [payForm, setPayForm] = useState({
    paymentMode: 'Bank Transfer' as const,
    referenceNo: '',
  });

  const [advForm, setAdvForm] = useState({
    amount: 3000,
    reason: '',
  });

  const loadDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getStaffDetail(id);
      setStaff(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;
    try {
      await recordPayment({
        staffId: staff.id,
        month: 'March 2024',
        amount: staff.netPayable,
        paymentMode: payForm.paymentMode,
        referenceNo: payForm.referenceNo.trim() || `TXN_${Date.now().toString().slice(-6)}`,
      });
      await loadDetail();
      setIsPayModalOpen(false);
    } catch (err) {
      alert('Failed to record payment');
    }
  };

  const handleAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;
    try {
      await giveAdvance({
        staffId: staff.id,
        amount: Number(advForm.amount),
        reason: advForm.reason.trim() || 'General advance',
        repaymentMonth: 'March 2024',
      });
      await loadDetail();
      setIsAdvModalOpen(false);
    } catch (err) {
      alert('Failed to grant advance');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-[#6B7686]">
        Loading staff payroll profile...
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="text-sm font-semibold text-[#1A2333]">Staff member not found.</div>
        <Link to="/payroll" className="text-xs text-[#2F6FED] hover:underline">
          Return to Payroll Register
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Back button */}
      <div>
        <Link
          to="/payroll"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B7686] hover:text-[#1A2333] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Payroll Register
        </Link>
      </div>

      {/* Staff Profile Header Card */}
      <div className="bg-white border border-[#E2E6ED] rounded-xl p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#E8EFFE] text-[#2F6FED] font-bold text-xl flex items-center justify-center border border-[#2F6FED]/20 flex-shrink-0">
            {staff.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-heading text-xl font-bold text-[#1A2333]">{staff.name}</h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#E8EFFE] text-[#2F6FED]">
                {staff.role}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7686] mt-1.5">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> {staff.phone}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> {staff.email}
              </span>
              <span>•</span>
              <span>Joined {staff.joiningDate}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {staff.paymentStatus === 'Pending' && (
            <button
              onClick={() => setIsPayModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2F6FED] hover:bg-[#2558bf] text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Disburse Salary
            </button>
          )}
          <button
            onClick={() => setIsAdvModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-[#E2E6ED] hover:bg-[#F5F7FA] rounded-lg text-xs font-medium text-[#1A2333] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Issue Advance
          </button>
        </div>
      </div>

      {/* Salary Configuration Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E6ED] rounded-xl p-5 shadow-subtle">
          <span className="text-xs font-medium uppercase tracking-wider text-[#6B7686]">
            Base Monthly Salary
          </span>
          <div className="mt-2 font-heading text-2xl font-bold text-[#1A2333] tabular-nums">
            {formatINR(staff.baseSalary)}
          </div>
          <div className="text-[11px] text-[#6B7686] mt-1">Contractual fixed pay</div>
        </div>

        <div className="bg-white border border-[#E2E6ED] rounded-xl p-5 shadow-subtle">
          <span className="text-xs font-medium uppercase tracking-wider text-[#6B7686]">
            Allowances & Incentives
          </span>
          <div className="mt-2 font-heading text-2xl font-bold text-[#2E9E6D] tabular-nums">
            +{formatINR(staff.allowances)}
          </div>
          <div className="text-[11px] text-[#6B7686] mt-1">PT coaching & performance</div>
        </div>

        <div className="bg-white border border-[#E2E6ED] rounded-xl p-5 shadow-subtle">
          <span className="text-xs font-medium uppercase tracking-wider text-[#6B7686]">
            Deductions & Advances
          </span>
          <div className="mt-2 font-heading text-2xl font-bold text-[#D14343] tabular-nums">
            -{formatINR(staff.deductions + staff.advancesCurrentMonth)}
          </div>
          <div className="text-[11px] text-[#6B7686] mt-1">
            PF/Tax ({formatINR(staff.deductions)}) + Advance ({formatINR(staff.advancesCurrentMonth)})
          </div>
        </div>

        <div className="bg-white border border-[#2F6FED]/40 rounded-xl p-5 shadow-subtle bg-[#E8EFFE]/20">
          <span className="text-xs font-medium uppercase tracking-wider text-[#2F6FED]">
            Current Net Payable
          </span>
          <div className="mt-2 font-heading text-2xl font-bold text-[#1A2333] tabular-nums">
            {formatINR(staff.netPayable)}
          </div>
          <div className="text-[11px] text-[#2F6FED] font-medium mt-1">
            Status: {staff.paymentStatus}
          </div>
        </div>
      </div>

      {/* Payment History & Slips */}
      <div className="bg-white border border-[#E2E6ED] rounded-xl shadow-subtle overflow-hidden">
        <div className="p-4 border-b border-[#E2E6ED] flex items-center justify-between">
          <div>
            <h2 className="font-heading text-base font-bold text-[#1A2333]">
              Disbursement & Salary Slip History
            </h2>
            <p className="text-xs text-[#6B7686]">
              Audit trail of all previous salary payouts and generated payslips
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E6ED] bg-[#F5F7FA] text-[11px] font-semibold uppercase text-[#6B7686] tracking-wider">
                <th className="py-3 px-4">Cycle Month</th>
                <th className="py-3 px-4">Disbursement Date</th>
                <th className="py-3 px-4 text-right">Base + Allowances</th>
                <th className="py-3 px-4 text-right">Deductions</th>
                <th className="py-3 px-4 text-right">Net Paid</th>
                <th className="py-3 px-4">Mode & Ref</th>
                <th className="py-3 px-4 text-right">Slip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E6ED] text-xs">
              {staff.paymentHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#6B7686]">
                    No historical payments recorded yet.
                  </td>
                </tr>
              ) : (
                staff.paymentHistory.map((pay) => (
                  <tr key={pay.id} className="hover:bg-[#F5F7FA] transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[#1A2333]">{pay.month}</td>
                    <td className="py-3.5 px-4 text-[#6B7686]">{pay.paymentDate}</td>
                    <td className="py-3.5 px-4 text-right tabular-nums text-[#1A2333]">
                      {formatINR(pay.baseSalary + pay.allowances)}
                    </td>
                    <td className="py-3.5 px-4 text-right tabular-nums text-[#D14343]">
                      -{formatINR(pay.deductions + pay.advancesRecovered)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold tabular-nums text-[#2E9E6D]">
                      {formatINR(pay.netPaid)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-[#1A2333] font-medium">{pay.paymentMode}</div>
                      <div className="text-[11px] text-[#6B7686] font-mono">{pay.referenceNo}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedSlip(pay)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border border-[#E2E6ED] hover:border-[#2F6FED] hover:text-[#2F6FED] rounded-md transition-colors text-[#1A2333] bg-white"
                      >
                        <FileText className="w-3 h-3" />
                        View Slip
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advance History */}
      <div className="bg-white border border-[#E2E6ED] rounded-xl shadow-subtle overflow-hidden">
        <div className="p-4 border-b border-[#E2E6ED] flex items-center justify-between">
          <div>
            <h2 className="font-heading text-base font-bold text-[#1A2333]">
              Salary Advance & Recovery Log
            </h2>
            <p className="text-xs text-[#6B7686]">
              Record of short-term advances requested and deductions applied
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E6ED] bg-[#F5F7FA] text-[11px] font-semibold uppercase text-[#6B7686] tracking-wider">
                <th className="py-3 px-4">Advance Date</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Reason / Purpose</th>
                <th className="py-3 px-4 text-right">Repayment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E6ED] text-xs">
              {staff.advanceHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[#6B7686]">
                    No salary advances issued for this staff member.
                  </td>
                </tr>
              ) : (
                staff.advanceHistory.map((adv) => (
                  <tr key={adv.id}>
                    <td className="py-3 px-4 text-[#1A2333]">{adv.date}</td>
                    <td className="py-3 px-4 text-right font-semibold tabular-nums text-[#D99A3E]">
                      {formatINR(adv.amount)}
                    </td>
                    <td className="py-3 px-4 text-[#6B7686]">{adv.reason}</td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          adv.repaymentStatus === 'Deducted'
                            ? 'bg-[#F5F7FA] text-[#2E9E6D] border border-[#2E9E6D]/30'
                            : 'bg-[#E8EFFE] text-[#D99A3E] border border-[#D99A3E]/30'
                        }`}
                      >
                        {adv.repaymentStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#E2E6ED] rounded-xl shadow-card w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-[#E2E6ED] flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-[#1A2333]">
                Disburse March 2024 Salary
              </h3>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-[#6B7686] hover:text-[#1A2333]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePay} className="p-6 space-y-4">
              <div className="p-3 bg-[#F5F7FA] rounded-lg text-xs flex justify-between">
                <span className="text-[#6B7686]">Amount to Disburse:</span>
                <span className="font-bold text-[#2F6FED] tabular-nums text-sm">
                  {formatINR(staff.netPayable)}
                </span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                  Payment Mode
                </label>
                <select
                  value={payForm.paymentMode}
                  onChange={(e) => setPayForm({ ...payForm, paymentMode: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED]"
                >
                  <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                  Transaction / Ref No
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC9901..."
                  value={payForm.referenceNo}
                  onChange={(e) => setPayForm({ ...payForm, referenceNo: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED]"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E6ED] rounded-lg text-xs font-medium text-[#1A2333]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2F6FED] text-white rounded-lg text-xs font-medium"
                >
                  Confirm Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Advance Modal */}
      {isAdvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#E2E6ED] rounded-xl shadow-card w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-[#E2E6ED] flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-[#1A2333]">Issue Advance</h3>
              <button
                onClick={() => setIsAdvModalOpen(false)}
                className="text-[#6B7686] hover:text-[#1A2333]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdvance} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1A2333] mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={advForm.amount}
                  onChange={(e) => setAdvForm({ ...advForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED] tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1A2333] mb-1">Reason</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Purpose of advance..."
                  value={advForm.reason}
                  onChange={(e) => setAdvForm({ ...advForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-[#E2E6ED] rounded-lg focus:outline-none focus:border-[#2F6FED]"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdvModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E6ED] rounded-lg text-xs font-medium text-[#1A2333]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2F6FED] text-white rounded-lg text-xs font-medium"
                >
                  Grant Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Slip Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#E2E6ED] rounded-xl shadow-card w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-6 space-y-5">
              <div className="text-center pb-4 border-b border-[#E2E6ED]">
                <div className="font-heading text-lg font-bold text-[#1A2333]">
                  Gym<span className="text-[#2F6FED]">ERP</span> Pay Slip
                </div>
                <div className="text-[11px] text-[#6B7686]">
                  Cycle: {selectedSlip.month} • Employee: {staff.name}
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#E2E6ED]">
                  <span className="text-[#6B7686]">Base Salary:</span>
                  <span className="tabular-nums font-medium text-[#1A2333]">
                    {formatINR(selectedSlip.baseSalary)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E2E6ED]">
                  <span className="text-[#6B7686]">Allowances:</span>
                  <span className="tabular-nums font-medium text-[#2E9E6D]">
                    +{formatINR(selectedSlip.allowances)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E2E6ED]">
                  <span className="text-[#6B7686]">Tax & PF Deductions:</span>
                  <span className="tabular-nums font-medium text-[#D14343]">
                    -{formatINR(selectedSlip.deductions)}
                  </span>
                </div>
                {selectedSlip.advancesRecovered > 0 && (
                  <div className="flex justify-between py-1 border-b border-[#E2E6ED]">
                    <span className="text-[#6B7686]">Advance Recovered:</span>
                    <span className="tabular-nums font-medium text-[#D99A3E]">
                      -{formatINR(selectedSlip.advancesRecovered)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2 font-bold text-sm text-[#1A2333]">
                  <span>Net Disbursed:</span>
                  <span className="tabular-nums text-[#2F6FED]">
                    {formatINR(selectedSlip.netPaid)}
                  </span>
                </div>
                <div className="text-[11px] text-[#6B7686]">
                  Paid on {selectedSlip.paymentDate} via {selectedSlip.paymentMode} (Ref:{' '}
                  {selectedSlip.referenceNo})
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E2E6ED]">
                <button
                  onClick={() => setSelectedSlip(null)}
                  className="px-3.5 py-1.5 border border-[#E2E6ED] rounded-lg text-xs font-medium text-[#1A2333]"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2F6FED] text-white rounded-lg text-xs font-medium"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Payslip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(StaffDetailPage);
