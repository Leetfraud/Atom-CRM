const BUCKET_CLASS = {
  mint: 'bg-mint-dim text-mint',
  down: 'bg-down-dim text-down',
  accent: 'bg-accent-dim text-accent',
  fog: 'bg-card-2 text-paper-dim',
}

const stageBucket = {
  'Prospects': 'fog',
  'Rejected': 'down',
  'Gamma To Do': 'accent',
  'Ready for Approval (No Loom)': 'accent',
  'Ready for Approval': 'accent',
  'Scripts To Do': 'accent',
  'Sent': 'accent',
  'Approved': 'mint',
  'Replied/In Discussion': 'mint',
  'Follow Up #1': 'accent',
  'Follow Up #2': 'accent',
  'Follow Up #3': 'accent',
  'Call Booked': 'mint',
  'Closed': 'mint',
  'Fumbled': 'down',
  'No Status': 'fog',
  'Not Interested': 'down',
  'Pending': 'fog',
  'Request Sent': 'accent',
  'Connected': 'mint',
  'Not Sent': 'fog',
  'Message Sent': 'accent',
  'Follow-up 1': 'accent',
  'Follow-up 2': 'accent',
  'Follow-up 3': 'accent',
  'Replied - Interested': 'mint',
  'Replied - Not Interested': 'down',
  'Replied - Already Working': 'accent',
  ["Call - Didn't Show Up"]: 'down',
  'Converted - Closed': 'mint',
  'No Response - Closed': 'fog',
  'Needs Gamma': 'accent',
  'Needs New Script': 'down',
  'Edits': 'accent',
  'No Results Available': 'fog',
  'Without Loom': 'fog',
  'D1': 'fog',
  'Discussion': 'accent',
  'Email': 'fog',
  'NoEmail': 'fog',
  'Bounced': 'down',
  'DMed on In': 'accent',
  'Disqualified': 'down',
  'Qualified': 'mint',
  'Cofounder': 'fog',
}

export default function Badge({ label }) {
  const bucket = stageBucket[label] ?? 'fog'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-[10.5px] ${BUCKET_CLASS[bucket]}`}>
      {label}
    </span>
  )
}
