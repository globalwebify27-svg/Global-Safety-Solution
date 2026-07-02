
  const downloadExcelReport = () => {
    if (!reportData) { toast.error("No report data."); return; }
    try {
      const plData = [["Type", "Account", "Code", "Amount (INR)"], ["P&L STATEMENT", "", "", ""], ...(reportData.profitAndLoss?.revenues || []).map((r: any) => ["Revenue", r.name, r.code, Number(r.periodBalance)]), ["Total Revenue", "", "", Number(reportData.profitAndLoss?.totalRevenue || 0)], ...(reportData.profitAndLoss?.expenses || []).map((e: any) => ["Expense", e.name, e.code, Number(e.periodBalance)]), ["Total Expense", "", "", Number(reportData.profitAndLoss?.totalExpense || 0)], ["Net Profit", "", "", Number(reportData.profitAndLoss?.netProfit || 0)]];
      const coaData = [["Code", "Account Name", "Type", "Balance (INR)"], ...(accounts || []).map(a => [a.code, a.name, a.type, Number(a.balance)])];
      const trialData = reportData.trialBalance ? [["Code", "Account Name", "Type", "Debit (Dr)", "Credit (Cr)"], ...(reportData.trialBalance || []).map((t: any) => [t.code, t.name, t.type, Number(t.debit), Number(t.credit)])] : [];
      const start = new Date(reportData.period?.startDate || new Date()), end = new Date(reportData.period?.endDate || new Date());
      const pv = (vouchers || []).filter(v => { const d = new Date(v.transaction_date); return d >= start && d <= end; });
      const ledgerData = [["Voucher No", "Date", "Debit Acc", "Credit Acc", "Debit", "Credit", "Narration", "Audited By"], ...pv.map(v => [v.voucher_no, new Date(v.transaction_date).toLocaleDateString(), `${v.debit_account?.name || ""}`, `${v.credit_account?.name || ""}`, Number(v.amount), Number(v.amount), v.description, v.created_by])];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(plData), "P&L Report");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(coaData), "Chart of Accounts");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trialData), "Trial Balance");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ledgerData), "Ledger Board");
      const { period, year, month } = reportFilter;
      const ds = period === "monthly" ? `${new Date(year, month).toLocaleString("default", { month: "short" })}-${year}` : period === "halfyearly" ? `H-${year}` : `${year}`;
      XLSX.writeFile(wb, `Financial_Report_${ds}.xlsx`); toast.success("Excel downloaded!");
    } catch { toast.error("Excel generation failed."); }
  };

  const downloadPDFReport = () => {
    if (!reportData) return;
    const doc = new jsPDF();
    const { period, year, month } = reportFilter;
    const ds = period === "monthly" ? new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" }) : period === "halfyearly" ? `Half Yearly (${year})` : `Yearly (${year})`;
    doc.setFontSize(20); doc.setFont("helvetica", "bold"); doc.text("GLOBAL SAFETY SOLUTION", 14, 20);
    doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text(`Consolidated Audit Statement - ${ds}`, 14, 28); doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 34); doc.line(14, 38, 196, 38);
    autoTable(doc, { startY: 42, head: [["Indicator", "Balance"]], body: [["Total Revenue", `INR ${(reportData.profitAndLoss?.totalRevenue || 0).toLocaleString()}`], ["Total Expenses", `INR ${(reportData.profitAndLoss?.totalExpense || 0).toLocaleString()}`], ["Net Profit", `INR ${(reportData.profitAndLoss?.netProfit || 0).toLocaleString()}`]], theme: "striped", styles: { fontSize: 10 }, headStyles: { fillColor: [79, 70, 229] } });
    let y = (doc as any).lastAutoTable.finalY + 15;
    autoTable(doc, { startY: y, head: [["Classification", "Balance"]], body: [["Total Assets", `INR ${(reportData.balanceSheet?.totalAssets || 0).toLocaleString()}`], ["Total Liabilities", `INR ${(reportData.balanceSheet?.totalLiabilities || 0).toLocaleString()}`], ["Total Equity", `INR ${(reportData.balanceSheet?.totalEquity || 0).toLocaleString()}`]], theme: "striped", styles: { fontSize: 10 }, headStyles: { fillColor: [13, 148, 136] } });
    doc.addPage();
    if (reportData.trialBalance) { doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text("Trial Balance", 14, 20); autoTable(doc, { startY: 26, head: [["Code", "Account", "Type", "Debit", "Credit"]], body: (reportData.trialBalance || []).map((t: any) => [t.code, t.name, t.type, `INR ${Number(t.debit).toLocaleString()}`, `INR ${Number(t.credit).toLocaleString()}`]), theme: "striped", styles: { fontSize: 9 }, headStyles: { fillColor: [234, 88, 12] } }); }
    const savDs = period === "monthly" ? `${new Date(year, month).toLocaleString("default", { month: "short" })}-${year}` : `${year}`;
    doc.save(`Financial_Report_${savDs}.pdf`); toast.success("PDF downloaded!");
  };

  const tabs = [
    { key: "ledgers" as TabType, label: "Ledger Board", icon: Activity },
    { key: "accounts" as TabType, label: "Chart of Accounts", icon: Scale },
    { key: "reports" as TabType, label: "Financial Reports", icon: TrendingUp },
    { key: "trialbalance" as TabType, label: "Trial Balance", icon: Scale },
    { key: "audit" as TabType, label: "Audit Trail", icon: ShieldAlert },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-muted-foreground flex items-center gap-3">
            <Calculator className="w-9 h-9 text-indigo-500" /> Tally Ledger & Accounts
          </h1>
          <p className="text-muted-foreground font-medium">Professional double-entry ledger book, chart of accounts, and audit reports.</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={openAccountDialog} onOpenChange={setOpenAccountDialog}>
            <DialogTrigger asChild><Button variant="outline" className="border-border hover:bg-accent/10 rounded-xl h-11 font-bold">Add Account</Button></DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground rounded-2xl max-w-md p-6">
              <DialogHeader><DialogTitle className="text-xl font-bold">New Ledger Account</DialogTitle><DialogDescription>Initialize a new account in your Chart of Accounts.</DialogDescription></DialogHeader>
              <form onSubmit={handleCreateAccount} className="space-y-4 py-4">
                <div className="space-y-1"><Label>Account Name</Label><Input placeholder="e.g. Petty Cash" value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} className="bg-background border-border" /></div>
                <div className="space-y-1"><Label>Account Code (Unique)</Label><Input placeholder="e.g. 1020" value={accountForm.code} onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })} className="bg-background border-border" /></div>
                <div className="space-y-1"><Label>Classification</Label>
                  <select value={accountForm.type} onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value, parent_id: "" })} className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground">
                    <option value="ASSET">ASSET</option><option value="LIABILITY">LIABILITY</option><option value="EQUITY">EQUITY</option><option value="REVENUE">REVENUE</option><option value="EXPENSE">EXPENSE</option>
                  </select>
                </div>
                <div className="space-y-1"><Label>Parent Account (Optional)</Label>
                  <select value={accountForm.parent_id} onChange={(e) => setAccountForm({ ...accountForm, parent_id: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground">
                    <option value="">None (Primary Category)</option>
                    {(accounts || []).filter(a => a.type === accountForm.type && !a.parent_id).map(a => (<option key={a.id} value={a.id}>{a.name} ({a.code})</option>))}
                  </select>
                </div>
                <div className="space-y-1"><Label>Opening Balance (INR - Optional)</Label><Input type="number" step="0.01" placeholder="0.00" value={accountForm.opening_balance} onChange={(e) => setAccountForm({ ...accountForm, opening_balance: e.target.value })} className="bg-background border-border" /></div>
                <DialogFooter><Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold w-full rounded-xl">Create Account</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={openTransactionDialog} onOpenChange={setOpenTransactionDialog}>
            <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-11 font-bold px-6 shadow-lg shadow-emerald-500/20"><Plus className="w-4 h-4 mr-2" /> Log Transaction</Button></DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground rounded-2xl max-w-lg p-6">
              <DialogHeader><DialogTitle className="text-xl font-bold">Log Transaction</DialogTitle><DialogDescription>Record a manual expense or income receipt.</DialogDescription></DialogHeader>
              <form onSubmit={handleCreateTransaction} className="space-y-4 py-4">
                <div className="space-y-1"><Label>Transaction Type</Label>
                  <select value={transactionForm.type} onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value as any, category_id: "" })} className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground">
                    <option value="EXPENSE">Expense (Outflow / Payment)</option><option value="REVENUE">Revenue (Inflow / Receipt)</option>
                  </select>
                </div>
                <div className="space-y-1"><Label>Category Account</Label>
                  <select value={transactionForm.category_id} onChange={(e) => setTransactionForm({ ...transactionForm, category_id: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground">
                    <option value="">Select Category</option>
                    {(accounts || []).filter(a => a.type === (transactionForm.type === "EXPENSE" ? "EXPENSE" : "REVENUE")).map(a => (<option key={a.id} value={a.id}>{a.name} ({a.code})</option>))}
                  </select>
                </div>
                <div className="space-y-1"><Label>{transactionForm.type === "EXPENSE" ? "Paid From (Bank/Cash Account)" : "Deposit To (Bank/Cash Account)"}</Label>
                  <select value={transactionForm.bank_account_id} onChange={(e) => setTransactionForm({ ...transactionForm, bank_account_id: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground">
                    <option value="">Select Account</option>
                    {(accounts || []).filter(a => a.type === "ASSET").map(a => (<option key={a.id} value={a.id}>{a.name} ({a.code})</option>))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><Label>Amount (INR)</Label><Input type="number" step="0.01" placeholder="0.00" value={transactionForm.amount} onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })} className="bg-background border-border" /></div>
                  <div className="space-y-1"><Label>Transaction Date</Label><Input type="date" value={transactionForm.transaction_date} onChange={(e) => setTransactionForm({ ...transactionForm, transaction_date: e.target.value })} className="bg-background border-border" /></div>
                </div>
                <div className="space-y-1"><Label>Narration</Label><Input placeholder="e.g. Paid Wi-Fi bill" value={transactionForm.description} onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })} className="bg-background border-border" /></div>
                <DialogFooter><Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold w-full rounded-xl">Save Transaction</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={openVoucherDialog} onOpenChange={setOpenVoucherDialog}>
            <DialogTrigger asChild><Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-11 font-bold px-6 shadow-lg shadow-indigo-500/20"><Plus className="w-4 h-4 mr-2" /> Post Voucher</Button></DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground rounded-2xl max-w-lg p-6">
              <DialogHeader><DialogTitle className="text-xl font-bold">New Journal Voucher (JV)</DialogTitle><DialogDescription>Record a custom double-entry ledger voucher.</DialogDescription></DialogHeader>
              <form onSubmit={handleCreateVoucher} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><Label>Debit Account (Dr.)</Label>
                    <select value={voucherForm.debit_code} onChange={(e) => setVoucherForm({ ...voucherForm, debit_code: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground">
                      <option value="">Select Account</option>
                      {(accounts || []).map(a => (<option key={a.id} value={a.code}>{a.name} ({a.code})</option>))}
                    </select>
                  </div>
                  <div className="space-y-1"><Label>Credit Account (Cr.)</Label>
                    <select value={voucherForm.credit_code} onChange={(e) => setVoucherForm({ ...voucherForm, credit_code: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground">
                      <option value="">Select Account</option>
                      {(accounts || []).map(a => (<option key={a.id} value={a.code}>{a.name} ({a.code})</option>))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><Label>Amount (INR)</Label><Input type="number" step="0.01" placeholder="0.00" value={voucherForm.amount} onChange={(e) => setVoucherForm({ ...voucherForm, amount: e.target.value })} className="bg-background border-border" /></div>
                  <div className="space-y-1"><Label>Posting Date</Label><Input type="date" value={voucherForm.transaction_date} onChange={(e) => setVoucherForm({ ...voucherForm, transaction_date: e.target.value })} className="bg-background border-border" /></div>
                </div>
                <div className="space-y-1"><Label>Narration</Label><Input placeholder="Enter transactional details" value={voucherForm.description} onChange={(e) => setVoucherForm({ ...voucherForm, description: e.target.value })} className="bg-background border-border" /></div>
                <DialogFooter><Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold w-full rounded-xl">Post Journal Voucher</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap border-b border-border/80">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn("px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2", activeTab === tab.key ? "border-indigo-500 text-indigo-500" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {loading && activeTab !== "reports" && activeTab !== "trialbalance" && activeTab !== "audit" ? (
        <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>
      ) : (
        <>
          {activeTab === "ledgers" && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-lg">Voucher Audit Entries</h3>
                <div className="relative"><Search className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground" /><Input placeholder="Search vouchers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-10 w-64 bg-background border-border rounded-xl" /></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="bg-accent/5 border-b border-border text-muted-foreground text-xs font-black uppercase tracking-wider"><th className="py-4 px-6">Voucher No</th><th className="py-4 px-6">Date</th><th className="py-4 px-6">Particulars (Dr / Cr)</th><th className="py-4 px-6 text-right">Debit (Dr)</th><th className="py-4 px-6 text-right">Credit (Cr)</th><th className="py-4 px-6">Narration</th><th className="py-4 px-6">Audited By</th></tr></thead>
                  <tbody className="divide-y divide-border/60 text-sm">
                    {filteredVouchers.length === 0 ? (<tr><td colSpan={7} className="py-10 text-center text-muted-foreground italic">No vouchers found.</td></tr>) : filteredVouchers.map(v => (
                      <tr key={v.id} className="hover:bg-accent/5 transition-colors">
                        <td className="py-4 px-6 font-bold text-indigo-500">{v.voucher_no}</td>
                        <td className="py-4 px-6 text-muted-foreground">{new Date(v.transaction_date).toLocaleDateString()}</td>
                        <td className="py-4 px-6 font-medium space-y-1"><div className="flex items-center gap-1.5 text-emerald-500"><ArrowUpRight className="w-3.5 h-3.5" />{v.debit_account?.name || ""} ({v.debit_account?.code || ""})</div><div className="flex items-center gap-1.5 text-rose-500 pl-4"><ArrowDownLeft className="w-3.5 h-3.5" />{v.credit_account?.name || ""} ({v.credit_account?.code || ""})</div></td>
                        <td className="py-4 px-6 text-right font-bold text-emerald-500">₹{Number(v.amount).toLocaleString()}</td>
                        <td className="py-4 px-6 text-right font-bold text-rose-500">₹{Number(v.amount).toLocaleString()}</td>
                        <td className="py-4 px-6 text-muted-foreground max-w-xs truncate cursor-help" title={v.description}>{v.description}</td>
                        <td className="py-4 px-6"><div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-indigo-400" /><span className="text-xs font-bold text-indigo-400">{v.created_by}</span></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "accounts" && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-border"><h3 className="font-bold text-lg">Chart of Accounts Ledger</h3></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead><tr className="bg-accent/5 border-b border-border text-muted-foreground text-xs font-black uppercase tracking-wider"><th className="py-4 px-6">Code</th><th className="py-4 px-6">Account Name</th><th className="py-4 px-6">Type</th><th className="py-4 px-6 text-right">Current Balance</th><th className="py-4 px-6 text-center">Actions</th></tr></thead>
                      <tbody className="divide-y divide-border/60 text-sm">
                        {(accounts || []).map(a => (
                          <tr key={a.id} className="hover:bg-accent/5 transition-colors">
                            <td className={cn("py-4 px-6 font-mono font-bold text-indigo-500", a.parent_id ? "pl-8 text-indigo-500/70" : "")}>{a.parent_id && <span className="text-muted-foreground mr-1">↳</span>}{a.code}</td>
                            <td className={cn("py-4 px-6 font-medium", a.parent_id ? "pl-8 text-muted-foreground text-xs" : "")}><button onClick={() => { setDrillAccount(a); setDrillStart(""); setDrillEnd(""); }} className="hover:text-indigo-500 hover:underline transition-colors text-left">{a.name}</button></td>
                            <td className="py-4 px-6"><span className={cn("text-xs px-2.5 py-1 rounded-full font-bold", accountTypeColor(a.type))}>{a.type}</span></td>
                            <td className={cn("py-4 px-6 text-right font-black text-base", Number(a.balance) >= 0 ? "text-emerald-500" : "text-rose-500")}>₹{Number(a.balance).toLocaleString()}</td>
                            <td className="py-4 px-6 text-center"><button onClick={() => { setEditOBAccount(a); setEditOBAmount(String(a.balance)); }} title="Edit Opening Balance" className="p-1.5 rounded-lg hover:bg-indigo-500/10 text-muted-foreground hover:text-indigo-500 transition-colors"><Pencil className="w-3.5 h-3.5" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-lg mb-4">Financial Equilibrium</h3>
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex justify-between items-center"><div><p className="text-xs text-muted-foreground font-medium uppercase">Total Assets</p><p className="text-xl font-bold text-emerald-500 mt-1">₹{(accounts || []).filter(a => a.type === "ASSET").reduce((sum, a) => sum + Number(a.balance), 0).toLocaleString()}</p></div><TrendingUp className="w-8 h-8 text-emerald-500 opacity-35" /></div>
                      <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 flex justify-between items-center"><div><p className="text-xs text-muted-foreground font-medium uppercase">Total Liabilities</p><p className="text-xl font-bold text-rose-500 mt-1">₹{(accounts || []).filter(a => a.type === "LIABILITY").reduce((sum, a) => sum + Number(a.balance), 0).toLocaleString()}</p></div><ShieldAlert className="w-8 h-8 text-rose-500 opacity-35" /></div>
                      <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 flex justify-between items-center"><div><p className="text-xs text-muted-foreground font-medium uppercase">Total Equity</p><p className="text-xl font-bold text-purple-500 mt-1">₹{(accounts || []).filter(a => a.type === "EQUITY").reduce((sum, a) => sum + Number(a.balance), 0).toLocaleString()}</p></div><DollarSign className="w-8 h-8 text-purple-500 opacity-35" /></div>
                    </div>
                  </div>
                </div>
              </div>
              {drillAccount && (
                <div className="bg-card border border-indigo-500/30 rounded-2xl shadow-lg overflow-hidden">
                  <div className="p-5 border-b border-border flex items-center justify-between bg-indigo-500/5">
                    <div><h3 className="font-bold text-base text-indigo-500">{drillAccount.name} ({drillAccount.code})</h3><p className="text-xs text-muted-foreground mt-0.5">Individual account ledger — date-filtered transaction history</p></div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label><Input type="date" value={drillStart} onChange={e => setDrillStart(e.target.value)} className="h-8 text-xs bg-background border-border w-36" />
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">To</Label><Input type="date" value={drillEnd} onChange={e => setDrillEnd(e.target.value)} className="h-8 text-xs bg-background border-border w-36" />
                      </div>
                      <button onClick={() => { setDrillAccount(null); setDrillEntries([]); }} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {drillLoading ? (<div className="flex items-center justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div></div>) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead><tr className="bg-accent/5 border-b border-border text-muted-foreground text-xs font-black uppercase tracking-wider"><th className="py-3 px-5">Voucher No</th><th className="py-3 px-5">Date</th><th className="py-3 px-5">Particulars</th><th className="py-3 px-5 text-right">Debit (Dr)</th><th className="py-3 px-5 text-right">Credit (Cr)</th><th className="py-3 px-5 text-right">Running Balance</th><th className="py-3 px-5">Audited By</th></tr></thead>
                        <tbody className="divide-y divide-border/60 text-sm">
                          {drillEntries.length === 0 ? (<tr><td colSpan={7} className="py-8 text-center text-muted-foreground italic">No transactions found for selected range.</td></tr>) : drillEntries.map((e: any) => (
                            <tr key={e.id} className="hover:bg-accent/5 transition-colors">
                              <td className="py-3 px-5 font-bold text-indigo-500 text-xs">{e.voucher_no}</td>
                              <td className="py-3 px-5 text-muted-foreground text-xs">{new Date(e.transaction_date).toLocaleDateString()}</td>
                              <td className="py-3 px-5 text-xs">{e.particulars} ({e.particulars_code})</td>
                              <td className="py-3 px-5 text-right text-xs font-bold text-emerald-500">{e.debit > 0 ? `₹${Number(e.debit).toLocaleString()}` : "—"}</td>
                              <td className="py-3 px-5 text-right text-xs font-bold text-rose-500">{e.credit > 0 ? `₹${Number(e.credit).toLocaleString()}` : "—"}</td>
                              <td className={cn("py-3 px-5 text-right text-xs font-black", e.balance >= 0 ? "text-emerald-500" : "text-rose-500")}>₹{Number(e.balance).toLocaleString()}</td>
                              <td className="py-3 px-5 text-xs text-indigo-400 font-semibold">{e.created_by}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {editOBAccount && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center backdrop-blur-sm" onClick={() => setEditOBAccount(null)}>
                  <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4"><div><h3 className="font-bold text-lg">Edit Opening Balance</h3><p className="text-xs text-muted-foreground mt-0.5">{editOBAccount.name} ({editOBAccount.code})</p></div><button onClick={() => setEditOBAccount(null)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"><X className="w-4 h-4" /></button></div>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4"><p className="text-xs text-amber-500 font-medium">Warning: This will reverse the old opening balance entry and create a new one. Both account balance and the ledger entry will be updated.</p></div>
                    <form onSubmit={handleUpdateOpeningBalance} className="space-y-4">
                      <div className="space-y-1"><Label>New Opening Balance (INR)</Label><Input type="number" step="0.01" placeholder="0.00" value={editOBAmount} onChange={e => setEditOBAmount(e.target.value)} className="bg-background border-border" autoFocus /></div>
                      <Button type="submit" disabled={editOBLoading} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold w-full rounded-xl">{editOBLoading ? "Updating..." : "Update Opening Balance"}</Button>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "reports" && (
            <div className="space-y-8">
              <div className="bg-card border border-border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex flex-col gap-1"><Label className="text-xs font-bold text-muted-foreground">Reporting Period</Label><select value={reportFilter.period} onChange={(e) => setReportFilter({ ...reportFilter, period: e.target.value as any })} className="h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground font-medium"><option value="monthly">Monthly Statement</option><option value="halfyearly">Half Yearly (H1/H2)</option><option value="yearly">Yearly Statement</option></select></div>
                  {reportFilter.period === "monthly" && (<div className="flex flex-col gap-1"><Label className="text-xs font-bold text-muted-foreground">Month</Label><select value={reportFilter.month} onChange={(e) => setReportFilter({ ...reportFilter, month: Number(e.target.value) })} className="h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground font-medium">{Array.from({ length: 12 }, (_, i) => (<option key={i} value={i}>{new Date(0, i).toLocaleString("default", { month: "long" })}</option>))}</select></div>)}
                  <div className="flex flex-col gap-1"><Label className="text-xs font-bold text-muted-foreground">Year</Label><select value={reportFilter.year} onChange={(e) => setReportFilter({ ...reportFilter, year: Number(e.target.value) })} className="h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground font-medium">{[2025, 2026, 2027].map(y => (<option key={y} value={y}>{y}</option>))}</select></div>
                </div>
                <div className="flex items-center gap-3 self-end"><Button onClick={downloadExcelReport} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-10 font-bold shadow-md shadow-indigo-500/20"><Download className="w-4 h-4 mr-2" /> Audit Excel</Button><Button onClick={downloadPDFReport} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-10 font-bold shadow-md shadow-emerald-500/20"><Download className="w-4 h-4 mr-2" /> Audit PDF</Button></div>
              </div>
              {loadingReport ? (<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>) : reportData ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
                      <div className="flex items-center justify-between border-b border-border pb-4"><h3 className="font-bold text-lg text-indigo-500 uppercase tracking-wider">Profit & Loss Statement</h3><TrendingUp className="w-5 h-5 text-indigo-500" /></div>
                      <div className="space-y-4">
                        <div><h4 className="text-xs font-black text-muted-foreground uppercase mb-2">Revenue Streams</h4><div className="space-y-1">{renderCollapsibleAccountRows(reportData.profitAndLoss?.revenues, "REVENUE", "text-emerald-500")}</div><div className="flex justify-between py-3 font-bold text-sm border-b-2 border-border/80 mt-1"><span>Total Revenue</span><span className="text-emerald-500 underline decoration-double">₹{Number(reportData.profitAndLoss?.totalRevenue || 0).toLocaleString()}</span></div></div>
                        <div className="pt-4"><h4 className="text-xs font-black text-muted-foreground uppercase mb-2">Operating Expenses</h4><div className="space-y-1">{renderCollapsibleAccountRows(reportData.profitAndLoss?.expenses, "EXPENSE", "text-rose-500")}</div><div className="flex justify-between py-3 font-bold text-sm border-b-2 border-border/80 mt-1"><span>Total Expenses</span><span className="text-rose-500">₹{Number(reportData.profitAndLoss?.totalExpense || 0).toLocaleString()}</span></div></div>
                        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex justify-between items-center mt-6"><span className="font-black text-base uppercase text-indigo-500">Net Business Profit</span><span className={cn("font-black text-xl underline decoration-double", Number(reportData.profitAndLoss?.netProfit || 0) >= 0 ? "text-emerald-500" : "text-rose-500")}>₹{Number(reportData.profitAndLoss?.netProfit || 0).toLocaleString()}</span></div>
                      </div>
                    </div>
                    <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
                      <div className="flex items-center justify-between border-b border-border pb-4"><h3 className="font-bold text-lg text-teal-500 uppercase tracking-wider">Balance Sheet Summary</h3><DollarSign className="w-5 h-5 text-teal-500" /></div>
                      <div className="space-y-4">
                        <div><h4 className="text-xs font-black text-muted-foreground uppercase mb-2">Assets (Dr.)</h4><div className="space-y-1">{renderCollapsibleAccountRows(reportData.balanceSheet?.assets, "ASSET", "text-emerald-500")}</div><div className="flex justify-between py-3 font-bold text-sm border-b-2 border-border/80 mt-1"><span>Total Assets</span><span className="text-emerald-500 underline decoration-double">₹{Number(reportData.balanceSheet?.totalAssets || 0).toLocaleString()}</span></div></div>
                        <div className="pt-4"><h4 className="text-xs font-black text-muted-foreground uppercase mb-2">Liabilities & Equity (Cr.)</h4><div className="space-y-1">{renderCollapsibleAccountRows(reportData.balanceSheet?.liabilities, "LIABILITY", "text-rose-500")}{renderCollapsibleAccountRows(reportData.balanceSheet?.equity, "EQUITY", "text-purple-500")}</div><div className="flex justify-between py-3 font-bold text-sm border-b-2 border-border/80 mt-1"><span>Total Liabilities & Equity</span><span className="text-teal-500 underline decoration-double">₹{(Number(reportData.balanceSheet?.totalLiabilities || 0) + Number(reportData.balanceSheet?.totalEquity || 0)).toLocaleString()}</span></div></div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between border-b border-border pb-4 mb-6"><h3 className="font-bold text-lg text-cyan-500 uppercase tracking-wider">Cash Flow Statement</h3><Waves className="w-5 h-5 text-cyan-500" /></div>
                    {cashFlowLoading ? (<div className="flex items-center justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500"></div></div>) : cashFlowData ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[{ key: "operating", label: "Operating Activities", color: "text-emerald-500", bg: "bg-emerald-500/5 border-emerald-500/20", data: cashFlowData.operating }, { key: "investing", label: "Investing Activities", color: "text-blue-500", bg: "bg-blue-500/5 border-blue-500/20", data: cashFlowData.investing }, { key: "financing", label: "Financing Activities", color: "text-purple-500", bg: "bg-purple-500/5 border-purple-500/20", data: cashFlowData.financing }].map(section => (
                          <div key={section.key} className={cn("rounded-xl p-4 border", section.bg)}>
                            <h4 className={cn("text-xs font-black uppercase mb-3", section.color)}>{section.label}</h4>
                            <div className="space-y-2">
                              {(!section.data || !section.data.items || section.data.items.length === 0) ? (<p className="text-xs text-muted-foreground italic">No activity.</p>) : section.data.items.map((item: any, i: number) => (<div key={i} className="flex justify-between items-start text-xs py-1.5 border-b border-border/30"><div className="flex-1 pr-2"><p className="font-medium truncate" title={item.description}>{item.description}</p><p className="text-muted-foreground">{item.opposite_account}</p></div><span className={cn("font-bold shrink-0", item.amount >= 0 ? "text-emerald-500" : "text-rose-500")}>₹{Math.abs(item.amount).toLocaleString()}</span></div>))}
                            </div>
                            <div className={cn("flex justify-between font-bold text-sm mt-3 pt-2 border-t border-border/60", section.color)}><span>Net</span><span>₹{Number(section.data?.total || 0).toLocaleString()}</span></div>
                          </div>
                        ))}
                        <div className="md:col-span-3 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex justify-between items-center"><span className="font-black text-base uppercase text-cyan-500">Net Cash Flow (Period)</span><span className={cn("font-black text-xl", Number(cashFlowData.netCashFlow || 0) >= 0 ? "text-emerald-500" : "text-rose-500")}>₹{Number(cashFlowData.netCashFlow || 0).toLocaleString()}</span></div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === "trialbalance" && (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-2xl p-6 flex flex-wrap items-center gap-4 shadow-sm">
                <div className="flex flex-col gap-1"><Label className="text-xs font-bold text-muted-foreground">Reporting Period</Label><select value={reportFilter.period} onChange={(e) => setReportFilter({ ...reportFilter, period: e.target.value as any })} className="h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground font-medium"><option value="monthly">Monthly</option><option value="halfyearly">Half Yearly</option><option value="yearly">Yearly</option></select></div>
                {reportFilter.period === "monthly" && (<div className="flex flex-col gap-1"><Label className="text-xs font-bold text-muted-foreground">Month</Label><select value={reportFilter.month} onChange={(e) => setReportFilter({ ...reportFilter, month: Number(e.target.value) })} className="h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground font-medium">{Array.from({ length: 12 }, (_, i) => (<option key={i} value={i}>{new Date(0, i).toLocaleString("default", { month: "long" })}</option>))}</select></div>)}
                <div className="flex flex-col gap-1"><Label className="text-xs font-bold text-muted-foreground">Year</Label><select value={reportFilter.year} onChange={(e) => setReportFilter({ ...reportFilter, year: Number(e.target.value) })} className="h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground font-medium">{[2025, 2026, 2027].map(y => (<option key={y} value={y}>{y}</option>))}</select></div>
                <div className="flex-1 flex justify-end"><Button onClick={fetchReport} className="bg-orange-600 hover:bg-orange-500 text-white rounded-xl h-10 font-bold">Generate Trial Balance</Button></div>
              </div>
              {loadingReport ? (<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>) : reportData?.trialBalance ? (
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-border flex items-center justify-between"><h3 className="font-bold text-lg">Trial Balance</h3><span className="text-xs text-muted-foreground">In a balanced system, Total Debits = Total Credits</span></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead><tr className="bg-accent/5 border-b border-border text-muted-foreground text-xs font-black uppercase tracking-wider"><th className="py-4 px-6">Code</th><th className="py-4 px-6">Account Name</th><th className="py-4 px-6">Type</th><th className="py-4 px-6 text-right">Debit (Dr)</th><th className="py-4 px-6 text-right">Credit (Cr)</th></tr></thead>
                      <tbody className="divide-y divide-border/60 text-sm">
                        {(reportData.trialBalance || []).map((t: any) => (<tr key={t.id} className="hover:bg-accent/5 transition-colors"><td className="py-3 px-6 font-mono font-bold text-indigo-500">{t.code}</td><td className="py-3 px-6 font-medium">{t.name}</td><td className="py-3 px-6"><span className={cn("text-xs px-2.5 py-1 rounded-full font-bold", accountTypeColor(t.type))}>{t.type}</span></td><td className="py-3 px-6 text-right font-bold text-emerald-500">{t.debit > 0 ? `₹${Number(t.debit).toLocaleString()}` : "—"}</td><td className="py-3 px-6 text-right font-bold text-rose-500">{t.credit > 0 ? `₹${Number(t.credit).toLocaleString()}` : "—"}</td></tr>))}
                      </tbody>
                      <tfoot>{(() => { const td = (reportData.trialBalance || []).reduce((s: number, t: any) => s + Number(t.debit), 0); const tc = (reportData.trialBalance || []).reduce((s: number, t: any) => s + Number(t.credit), 0); const bal = Math.abs(td - tc) < 0.01; return (<tr className={cn("border-t-2 font-black text-sm", bal ? "bg-emerald-500/5 border-emerald-500/30" : "bg-rose-500/5 border-rose-500/30")}><td colSpan={3} className="py-4 px-6">{bal ? <span className="text-emerald-500">✓ Balanced — Books are correct</span> : <span className="text-rose-500">✗ Unbalanced — Diff: ₹{Math.abs(td - tc).toLocaleString()}</span>}</td><td className="py-4 px-6 text-right text-emerald-500">₹{td.toLocaleString()}</td><td className="py-4 px-6 text-right text-rose-500">₹{tc.toLocaleString()}</td></tr>); })()}</tfoot>
                    </table>
                  </div>
                </div>
              ) : (<div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground"><Scale className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="font-medium">Select a period and click Generate Trial Balance</p></div>)}
            </div>
          )}

          {activeTab === "audit" && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-border flex items-center justify-between"><div><h3 className="font-bold text-lg">Audit Trail</h3><p className="text-xs text-muted-foreground mt-0.5">Complete log of all financial actions performed by staff</p></div><Button onClick={fetchAuditLog} variant="outline" className="rounded-xl h-9 text-sm font-bold border-border">Refresh</Button></div>
              {auditLoading ? (<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead><tr className="bg-accent/5 border-b border-border text-muted-foreground text-xs font-black uppercase tracking-wider"><th className="py-4 px-6">Timestamp</th><th className="py-4 px-6">Action</th><th className="py-4 px-6">Entity</th><th className="py-4 px-6">Staff (Who)</th><th className="py-4 px-6">Details</th></tr></thead>
                    <tbody className="divide-y divide-border/60 text-sm">
                      {auditLogs.length === 0 ? (<tr><td colSpan={5} className="py-10 text-center text-muted-foreground italic">No audit logs recorded yet.</td></tr>) : auditLogs.map((log: any) => {
                        let parsedData: any = {};
                        try { parsedData = JSON.parse(log.new_data || "{}"); } catch {}
                        const staffName = parsedData.created_by || parsedData.updated_by || "System";
                        const actionColors: Record<string, string> = { CREATE_ACCOUNT: "bg-blue-500/10 text-blue-500", POST_VOUCHER: "bg-emerald-500/10 text-emerald-500", EDIT_OPENING_BALANCE: "bg-amber-500/10 text-amber-500" };
                        return (
                          <tr key={log.id} className="hover:bg-accent/5 transition-colors">
                            <td className="py-4 px-6 text-xs text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                            <td className="py-4 px-6"><span className={cn("text-xs px-2.5 py-1 rounded-full font-bold", actionColors[log.action] || "bg-gray-500/10 text-gray-500")}>{log.action}</span></td>
                            <td className="py-4 px-6 text-xs font-mono text-muted-foreground">{log.entity_type}</td>
                            <td className="py-4 px-6"><div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-indigo-400" /><span className="text-xs font-bold text-indigo-400">{staffName}</span></div></td>
                            <td className="py-4 px-6 text-xs text-muted-foreground max-w-xs">
                              {parsedData.voucher_no && <span className="font-bold text-foreground mr-1">{parsedData.voucher_no}</span>}
                              {parsedData.debit && <span>Dr: {parsedData.debit} | Cr: {parsedData.credit}</span>}
                              {parsedData.name && <span>Account: {parsedData.name} ({parsedData.code})</span>}
                              {parsedData.opening_balance !== undefined && <span>Opening Balance: ₹{Number(parsedData.opening_balance).toLocaleString()}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

