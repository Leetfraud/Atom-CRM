const stageColors = {
  'Prospects': 'bg-gray-700 text-gray-200',
  'Rejected': 'bg-red-900 text-red-300',
  'Gamma To Do': 'bg-yellow-900 text-yellow-300',
  'Ready for Approval (No Loom)': 'bg-orange-900 text-orange-300',
  'Ready for Approval': 'bg-orange-800 text-orange-200',
  'Scripts To Do': 'bg-purple-900 text-purple-300',
  'Sent': 'bg-blue-900 text-blue-300',
  'Approved': 'bg-green-900 text-green-300',
  'Replied/In Discussion': 'bg-teal-900 text-teal-300',
  'Follow Up #1': 'bg-cyan-900 text-cyan-300',
  'Follow Up #2': 'bg-cyan-800 text-cyan-200',
  'Follow Up #3': 'bg-cyan-700 text-cyan-100',
  'Call Booked': 'bg-indigo-900 text-indigo-300',
  'Closed': 'bg-green-800 text-green-200',
  'Fumbled': 'bg-red-800 text-red-200',
  'No Status': 'bg-gray-800 text-gray-400',
  'Not Interested': 'bg-red-950 text-red-400',
  'Pending': 'bg-yellow-900 text-yellow-300',
  'Connected': 'bg-green-900 text-green-300',
  'Not Sent': 'bg-gray-800 text-gray-400',
  'Message Sent': 'bg-blue-900 text-blue-300',
  'Follow-up 1': 'bg-cyan-900 text-cyan-300',
  'Follow-up 2': 'bg-cyan-800 text-cyan-200',
  'Follow-up 3': 'bg-cyan-700 text-cyan-100',
  'Replied - Interested': 'bg-green-900 text-green-300',
  'Replied - Not Interested': 'bg-red-900 text-red-300',
  'Replied - Already Working': 'bg-orange-900 text-orange-300',
  ["Call - Didn't Show Up"]: 'bg-red-800 text-red-200',
  'Converted - Closed': 'bg-green-800 text-green-200',
  'No Response - Closed': 'bg-gray-700 text-gray-300',
  'Needs Gamma': 'bg-yellow-900 text-yellow-300',
  'Needs New Script': 'bg-red-900 text-red-300',
  'Edits': 'bg-orange-900 text-orange-300',
  'No Results Available': 'bg-gray-800 text-gray-400',
  'CA Student': 'bg-blue-900 text-blue-300',
  'Usama': 'bg-purple-900 text-purple-300',
  'Without Loom': 'bg-pink-900 text-pink-300',
  'D1': 'bg-teal-900 text-teal-300',
  'Discussion': 'bg-indigo-900 text-indigo-300',
  'Email': 'bg-blue-800 text-blue-200',
  'NoEmail': 'bg-gray-700 text-gray-300',
  'Bounced': 'bg-red-950 text-red-400',
  'DMed on In': 'bg-cyan-900 text-cyan-300',
  'Disqualified': 'bg-red-900 text-red-300',
  'Qualified': 'bg-green-900 text-green-300',
  'Cofounder': 'bg-violet-900 text-violet-300',
}

export default function Badge({ label }) {
  const color = stageColors[label] ?? 'bg-gray-800 text-gray-300'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}