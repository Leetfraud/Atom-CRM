import StatCard from '../ui/StatCard'
import { MailIcon, ChatIcon, DocIcon, PhoneIcon, TrophyIcon, LinkIcon, DollarIcon } from '../ui/icons'

export default function StatsRow({ monthlyTotals, replyRate, closeRate, docOpenRate, pkrRate }) {
  return (
    <div className="bg-card border border-line rounded-[26px] p-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Emails Sent"
          value={monthlyTotals?.emails_sent ?? 0}
          icon={<MailIcon />}
        />
        <StatCard
          label="Replies"
          value={monthlyTotals?.replies ?? 0}
          icon={<ChatIcon />}
          sub={`${replyRate}% reply rate`}
        />
        <StatCard
          label="Doc Opens"
          value={monthlyTotals?.docs_opened ?? 0}
          icon={<DocIcon />}
          sub={`${docOpenRate}% open rate`}
        />
        <StatCard
          label="Calls Booked"
          value={monthlyTotals?.calls_booked ?? 0}
          icon={<PhoneIcon />}
        />
        <StatCard
          label="Closes"
          value={monthlyTotals?.closes ?? 0}
          icon={<TrophyIcon />}
          accent
          sub={`${closeRate}% close rate`}
        />
        <StatCard
          label="LinkedIn DMs"
          value={monthlyTotals?.linkedin_dms ?? 0}
          icon={<LinkIcon />}
        />
        <StatCard
          label="Cash Collected (USD)"
          value={`$${(monthlyTotals?.cash_collected_usd ?? 0).toLocaleString()}`}
          icon={<DollarIcon />}
          accent
        />
        <StatCard
          label="Cash Collected (PKR)"
          value={`₨${((monthlyTotals?.cash_collected_usd ?? 0) * pkrRate).toLocaleString()}`}
          icon={<DollarIcon />}
        />
      </div>
    </div>
  )
}
