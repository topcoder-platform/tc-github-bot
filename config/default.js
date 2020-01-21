module.exports = {
  BUG_BASH_LABEL: process.env.BUG_BASH_LABEL || 'CF-20',

  LABEL: {
    OPEN_FOR_PICKUP: process.env.LABEL_OPEN_FOR_PICKUP || 'Open for Pickup',
    FEEDBACK: process.env.LABEL_FEEDBACK || 'Feedback',
    ACCEPTED: process.env.LABEL_ACCEPTED || 'ACCEPTED',
    READY_FOR_REVIEW: process.env.LABEL_READY_FOR_REVIEW || 'Ready for Review'
  }
}
