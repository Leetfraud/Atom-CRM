import StatCard from '../ui/StatCard'

export default function StatsRow({ monthlyTotals, replyRate, closeRate, docOpenRate, pkrRate }) {
  return (
    <div className="grid grid-cols-4 gap-4 p-6 border-b border-[#1f1f1f]">
      <StatCard
        label="Emails Sent"
        value={monthlyTotals?.emails_sent ?? 0}
        icon="✉️"
      />
      <StatCard
        label="Replies"
        value={monthlyTotals?.replies ?? 0}
        icon="💬"
        sub={`${replyRate}% reply rate`}
      />
      <StatCard
        label="Doc Opens"
        value={monthlyTotals?.docs_opened ?? 0}
        icon="📄"
        sub={`${docOpenRate}% open rate`}
      />
      <StatCard
        label="Calls Booked"
        value={monthlyTotals?.calls_booked ?? 0}
        icon="📞"
      />
      <StatCard
        label="Closes"
        value={monthlyTotals?.closes ?? 0}
        icon="🏆"
        accent
        sub={`${closeRate}% close rate`}
      />
      <StatCard
        label="LinkedIn DMs"
        value={monthlyTotals?.linkedin_dms ?? 0}
        icon="🔗"
      />
      <StatCard
        label="Cash Collected (USD)"
        value={`$${(monthlyTotals?.cash_collected_usd ?? 0).toLocaleString()}`}
        icon="💵"
        accent
      />
      <StatCard
        label="Cash Collected (PKR)"
        value={`₨${((monthlyTotals?.cash_collected_usd ?? 0) * pkrRate).toLocaleString()}`}
        icon="💰"
      />
    </div>
  )
}
