/**
 * Reconciliation Engine
 * Comapres Bank Statement vs Gateway Report
 */

/**
 * @param {Array} bankTransactions 
 * @param {Array} gatewayTransactions 
 * @param {Object} options { dateTolerance, amountTolerance }
 */
function reconcileTransactions(bankTransactions, gatewayTransactions, options = {}) {
  const matches = [];
  const discrepancies = [];
  const unmatchedBank = [];
  const unmatchedGateway = [...gatewayTransactions];

  const dateTolerance = options.dateTolerance || 3;
  const amountTolerance = options.amountTolerance || 0;

  bankTransactions.forEach(bankTx => {
    let foundMatch = null;
    let matchType = 'auto';
    let discrepancyDetails = null;

    // 1. Try exact Reference ID match (Highest Priority)
    if (bankTx.referenceId) {
      foundMatch = unmatchedGateway.find(gtx => gtx.referenceId === bankTx.referenceId);
      if (foundMatch) matchType = 'reference';
    }

    // 2. Try Amount + Date matching (Standard Algorithm)
    if (!foundMatch) {
      for (let i = 0; i < unmatchedGateway.length; i++) {
        const gtx = unmatchedGateway[i];
        const amountDiff = Math.abs(bankTx.amount - gtx.amount);
        const dateDiff = Math.abs(new Date(bankTx.transactionDate) - new Date(gtx.transactionDate)) / (100 * 60 * 60 * 24 * 10); // simplified ms to days

        // Date diff in days - exact calc
        const dateDiffDays = Math.abs(new Date(bankTx.transactionDate).getTime() - new Date(gtx.transactionDate).getTime()) / (1000 * 60 * 60 * 24);

        // Perfect Match
        if (amountDiff === 0 && dateDiffDays <= dateTolerance) {
          foundMatch = gtx;
          if (dateDiffDays > 0) matchType = 'timing_difference';
          break;
        }

        // Potential Match with Mismatch (Discrepancy)
        if (amountDiff > 0 && amountDiff <= (amountTolerance || 500) && dateDiffDays <= dateTolerance) {
          foundMatch = gtx;
          matchType = 'amount_mismatch';
          discrepancyDetails = {
            type: 'amount_mismatch',
            difference: amountDiff,
            bankAmount: bankTx.amount,
            gatewayAmount: gtx.amount
          };
          break;
        }
      }
    }

    if (foundMatch) {
      const matchObj = {
        bankTransaction: bankTx,
        gatewayTransaction: foundMatch,
        type: matchType,
        discrepancy: discrepancyDetails
      };

      if (matchType === 'amount_mismatch') {
        discrepancies.push(matchObj);
      } else {
        matches.push(matchObj);
      }

      // Remove from unmatched gateway pool
      const index = unmatchedGateway.findIndex(gtx => gtx._id.toString() === foundMatch._id.toString());
      if (index > -1) unmatchedGateway.splice(index, 1);
    } else {
      unmatchedBank.push(bankTx);
    }
  });

  return { 
    matches, 
    discrepancies, 
    unmatchedBank, 
    unmatchedGateway 
  };
}

module.exports = { reconcileTransactions };
