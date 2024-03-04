class Evaluation {
    constructor(data) {
      this.applicantName = data.applicantName || '';
      this.loanType = data.loanType || '';
      this.sfdcNo = data.sfdcNo || '';
      this.propertyOwner = data.propertyOwner || '';
      this.typeOfProperty = data.typeOfProperty || '';
      this.postalAddress = data.postalAddress || '';
      this.landMark = data.landMark || '';
      this.northBy = data.northBy || '';
      this.southBy = data.southBy || '';
      this.eastBy = data.eastBy || '';
      this.westBy = data.westBy || '';
      this.scheduleProperty = data.scheduleProperty || '';
      this.contactPerson = data.contactPerson || '';
      this.contactNoMobile = data.contactNoMobile || '';
      this.contactNoLandline = data.contactNoLandline || '';
      this.planCopy = data.planCopy || '';
      this.planCopyApprovedNo = data.planCopyApprovedNo || '';
      this.planCopyApprovedBy = data.planCopyApprovedBy || '';
      this.typeOfDeed = data.typeOfDeed || '';
      this.propertyTaxReceipt = data.propertyTaxReceipt || '';
      this.billReceipt = data.billReceipt || '';
      this.buildingArea = data.buildingArea || '';
      this.udsArea = data.udsArea || '';
    }
  
    // You can add methods to perform actions related to the model if needed
  }
  
  module.exports = Evaluation;
  