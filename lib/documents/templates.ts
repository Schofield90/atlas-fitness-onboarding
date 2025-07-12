export const COMPANY_INFO = {
  legalName: 'Schofield Fitness Ltd',
  tradingAs: 'Atlas Fitness',
  locations: {
    York: {
      address: '2 George Cayley Drive, York YO30 4XE',
      phone: 'TBC', // Add phone number
    },
    Harrogate: {
      address: 'Unit 7 Claro Court Business Centre, HG1 4BA',
      phone: 'TBC', // Add phone number
    },
  },
};

export interface EmployeeDetails {
  name: string;
  email: string;
  jobTitle: string;
  annualSalary: number;
  hoursPerWeek: number;
  location: 'York' | 'Harrogate';
  startDate: string;
}

// Statement of Main Terms of Employment Template
export const getStatementOfTermsContent = (employee: EmployeeDetails) => {
  const locationInfo = COMPANY_INFO.locations[employee.location];
  const formattedSalary = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(employee.annualSalary);

  return `STATEMENT OF MAIN TERMS OF EMPLOYMENT

This statement, together with the employee handbook, forms part of your contract of employment (except where the contrary is expressly stated) and sets out particulars of the main terms on which Atlas Fitness York Ltd, 2 George Cayley Drive, York YO30 4XE

Employs: ${employee.name}

Your employment began on ${new Date(employee.startDate).toLocaleDateString('en-GB')}

No previous employment counts as part of your period of continuous employment.

JOB TITLE
You are employed as ${employee.jobTitle} and your duties will be as advised by the Managing Director. Your duties may be modified from time to time to suit the needs of the business.

PROBATIONARY PERIOD
You join us on an initial probationary period of three months. During this period your work performance and general suitability will be assessed and, if it is satisfactory, your employment will continue. However, if your work performance is not up to the required standard, or you are considered to be generally unsuitable, we may either take remedial action (which may include the extension of your probationary period) or terminate your employment at any time. You will be informed of the outcome of your probationary period by the Managing Director and you should not consider your probationary period to have passed until such notification has been received. We reserve the right not to apply our full contractual capability and disciplinary procedures during your probationary period.

PLACE OF WORK
${locationInfo.address}. You will not be required to work outside the United Kingdom.

HOURS OF WORK
Your normal hours of work are not variable; however, your working pattern may vary. Your normal hours of work are ${employee.hoursPerWeek} per week, to be worked between 5.45 am and 8.30 pm, Monday to Sunday. Breaks are paid and in line with the Working Time Regulations. Actual days, start/finish times will be variable and in accordance with the rota which will normally be available in advance, although there may be times where you will be given shorter notice of your hours of work. You may be required to work additional hours as necessitated by the needs of the business including weekends, on public holidays or at other times outside your normal hours of work.

REMUNERATION
Your salary is currently ${formattedSalary} per annum payable monthly by BACS as detailed on your pay statement. In your first year of employment your salary will be proportionate to the amount of time left in the year. We will ensure that you always receive no less than the National Minimum Wage. Additional hours worked you will be paid at your basic rate.

COLLECTIVE AGREEMENTS
No collective agreements directly affect your terms and conditions of employment.

BENEFITS
In addition to any which may be mentioned elsewhere in this statement, your position has the benefit of:
• an Employee Assistance Programme
• Free uniform when necessary
• Complementary use of facilities for own training

Details of the above are shown separately. The above do not form part of your contract of employment and may be amended or withdrawn at any time.

ANNUAL LEAVE AND PUBLIC/BANK HOLIDAYS
Your holiday year begins on 1st January and ends on 31st December each year, during which you will receive a paid holiday entitlement of 20 days in addition to any of the public/bank holidays. Entitlements are pro-rata for part-time employees. In your first holiday year your entitlement will be proportionate to the amount of time left in the holiday year. Your holiday pay will be based on your average earnings over the previous 52 weeks in which wages were payable. Conditions relating to the taking of annual leave are shown in the Employee Handbook to which you should refer.

Due to the nature of our business you may be required to work on any of the public/bank holidays listed below, and it is a condition of employment that you work on these days when required to do so. If you are required to work on any of these days you will be given an alternative day of leave in lieu. The date when a day off in lieu is to be taken is to be mutually agreed with us.

The public/bank holidays each year are:
• New Year's Day
• Good Friday  
• Easter Monday
• The first Monday in May
• The last Monday in May
• The last Monday in August
• Christmas Day
• Boxing Day

In the event of you working on any of the above public/bank holidays, you will be paid at single time for the hours worked. In the event of termination of employment holiday entitlement will be calculated as 1/12th of the annual entitlement for each completed month of service during that holiday year and any holidays accrued but not taken will be paid for. However, in the event of you having taken any holidays in the current holiday year, which have not been accrued pro-rata, then the appropriate payments will be deducted from your final pay. We may require you to take any outstanding annual leave entitlement during your notice period.

SICK LEAVE, PAY AND CONDITIONS
Any sickness absence taken is paid in line with our contractual sick/injury pay scheme (inclusive of SSP) which, on completion of three month's continuous service, provides payment during periods of certificated sickness for up to a maximum of 10 working days in any rolling twelve month rolling period. Conditions relating to the above are shown in the Employee Handbook to which you should refer.

OTHER PAID LEAVE
You are entitled to the following types of paid leave subject to any qualifying criteria and notification requirements:
i) Maternity, paternity, adoption, shared parental leave with pay in line with statutory entitlements in place from time to time.
ii) Bereavement leave, the length of which is to be determined on an individual basis, paid at full pay at the discretion of the Managing Director.
iii) Qualifying parents are entitled to parental bereavement leave in line with statutory entitlements in place from time to time.

The details included at ii) above do not form part of your contract of employment and may be amended or withdrawn at any time.

TRAINING
At the commencement of your employment you will receive training for your specific job, and as your employment progresses your skills may be extended to encompass new job activities within the business. It is a condition of your employment that you participate in any training deemed necessary by us for you to reach the required levels of attainment standards. In addition, we encourage employees to undertake external training courses where the period of training may further their career with us. Financial assistance may be provided where the Managing Director believes that the performance of the Company will benefit from your progression. Where it is provided, this will be subject to a training agreement which requires repayment by you to the Company of the cost of the training on a sliding scale in the event of the termination of your employment. Further details are available from the Managing Director.

CAPABILITY AND DISCIPLINARY PROCEDURES
The disciplinary rules and procedures that will apply when dealing with capability or disciplinary issues are shown under the headings "Capability Procedures" and "Disciplinary Procedures" in the Employee Handbook to which you should refer.

CAPABILITY/DISCIPLINARY APPEAL PROCEDURE
Should you be dissatisfied with any decision to take action or dismiss you on capability/disciplinary grounds, you must apply, either verbally or in writing, to the Managing Director within five working days of the decision you are complaining against. The Company will exercise discretion in hearing appeals which are submitted outside of this timeframe. Further information can be found in the Employee Handbook under the heading "Capability/Disciplinary Appeal Procedure" to which you should refer.

GRIEVANCE PROCEDURE
Should you feel aggrieved at any matter relating to your employment, raise a grievance promptly with the Managing Director, either verbally or in writing. Whilst there is no deadline by which grievances must be lodged, it may be more difficult for the Company to effectively deal with your grievance if the complaints relate to something which took place a long time ago. Further information can be found in the Employee Handbook.

NOTICE OF TERMINATION TO BE GIVEN BY EMPLOYER
• Under 1 month's service - Nil.
• 1 month up to successful completion of your probationary period - 1 week.
• On successful completion of your probationary period but less than 6 years' service – 6 weeks
• 6 years' service or more - 1 week for each completed year of service to a maximum of 12 weeks after 12 years.

NOTICE OF TERMINATION TO BE GIVEN BY EMPLOYEE
• Under 1 month's service - Nil.
• 1 month up to successful completion of your probationary period - 1 week.
• On successful completion of your probationary period – 6 weeks

PAY IN LIEU OF NOTICE
We reserve the contractual right to give pay in lieu of all or any part of the above notice by either party.

PENSION AND PENSION SCHEME
We operate a contributory pension scheme which you will be auto-enrolled into (subject to the conditions of the scheme). Further details are available from the Managing Director.

SIGNATURE: For and on behalf of the Employer                    DATE:

I acknowledge receipt of this statement and agree that, for the purpose of the Working Time Regulations, any applicable entitlements and provisions constitute a relevant agreement.

SIGNATURE: Employee                                             DATE:`;
};

// Restrictive Covenant Agreement Template
export const getRestrictiveCovenantContent = (employee: EmployeeDetails) => {
  const locationInfo = COMPANY_INFO.locations[employee.location];
  
  return `RESTRICTIVE COVENANT AGREEMENT

This Agreement is made between Schofield Fitness Ltd (the Company) of ${locationInfo.address} and ${employee.name} (the Employee).

The Employee agrees to be bound by the restrictive covenants set out in this Agreement, and further agrees that this Agreement forms part of, and is incorporated into, their contract of employment with the Company.

DEFINITIONS
"Relevant Address" shall mean ${locationInfo.address}

"Restricted Business" shall mean any business or activity carried on by the Company at any time during the Relevant Period and in which the Employee shall have been directly concerned during the Relevant Period, or in respect of which they had access to confidential information.

"Restricted Client" shall mean any person, firm or company or other organisation or entity who was at any time in the Relevant Period a Client of the Company.

"Prospective Clients" shall mean any person, firm, company or other organisation or entity who at the date of termination of the Employee's employment with the Company was engaged in negotiation with the Company with a view to engaging the Company's services.

"Relevant Period" shall mean the six-month period preceding the date of termination of the Employee's employment with the Company, ending on that date.

CLAUSE 1 - NON-SOLICITATION AND NON-DEALING COVENANTS

Of Restricted Clients:
The Employee shall not, during the period of six months after the date of termination of their employment with the Company, directly or indirectly on their own account or on behalf of or in conjunction with any person, firm, company or other organisation or entity either:
a) conduct Restricted Business; or
b) canvass or solicit or by any other means seek to conduct Restricted Business;
with any Restricted Client within a ten-mile radius of the Relevant Address.

Of Prospective Clients:
The Employee shall not during the period of six months after the date of termination of their employment with the Company, directly or indirectly on their own account or on behalf of or in conjunction with any person, firm, company or other organisation or entity either:
a) conduct Restricted Business; or
b) canvass or solicit or by any other means seek to conduct Restricted Business;
with any Prospective Client within a ten-mile radius of the Relevant Address.

CLAUSE 2 - CONFIDENTIALITY
The Employee shall not make use of, divulge or communicate to any person (save in the proper performance of their duties) any trade secrets or other confidential information of or relating to the Company, or that of other persons or bodies with whom the Company has dealings of any sort, which the Employee may have received or obtained, or has otherwise been acquired by them in confidence, whilst in the employment of the Company.

This restriction shall continue to apply after the termination of the employee's employment without limit in point of time, but shall cease to apply to information ordered to be disclosed by a Court of competent jurisdiction or otherwise required to be disclosed by law.

Confidential information shall include but shall not be limited to 'Client information'. 'Client information' includes information relating to:
• The names or addresses or telephone numbers of the Company's Clients and/or the employees of such Clients with whom the Company has had contact.
• The requirements of such Clients for Group Personal Training

The Employee is to exercise reasonable care to keep safe all documentary or other material containing confidential information, and shall at the time of termination of their employment with the Company, or at any other time upon demand, return to the Company any such material in their possession.

CLAUSE 3 - COPYRIGHT
All written material, whether held on paper, electronically or magnetically which was made or acquired by the Employee during the course of employment with the Company, is the Company's property and copyright. At the time of termination of employment with the Company, or at any other time upon demand, the Employee shall return to the Company any such material in their possession.

CLAUSE 4 - NON-POACHING OF EMPLOYEES
The Employee shall not either during their employment with the Company or during the period of six months after the date of termination of their employment with the Company, directly or indirectly induce or seek to induce any employees who were employed by the Company at the date of termination of the Employee's employment and with whom they had personal and material contact/dealings to leave the employment of the Company, whether or not this would constitute a breach of contract on the part of the aforementioned other employee.

CLAUSE 5 - PREVENTION OF EMPLOYMENT BY CLIENTS
The Employee shall not during the period of six months after the date of termination of their employment with the Company directly or indirectly be engaged or employed by any Restricted Client with whom the Employee shall have had personal and material dealings in the course of their duties during the Relevant Period, or about whom they had access to confidential information.

CLAUSE 6 - NON COMPETITION
The Employee hereby undertakes with the Company that they will not (without the prior written consent of the Company) during their employment and during the period of three months after the date of termination of their employment whether by themselves, through their employees or agents or otherwise or howsoever, and whether on their own behalf of any other person, firm, company, or other organisation directly or indirectly in competition with the Company, be employed or engaged or otherwise conduct any Restricted Business.

The employee hereby undertakes with the Company that they will not at any time after the termination of their employment in the course of carrying on any trade or business, claim, represent or otherwise indicate any association with the Company, or for the purpose of carrying on or retaining any business or custom, claim, represent or otherwise indicate any past association with the Company to its detriment.

CLAUSE 7 - INTELLECTUAL PROPERTY
It is anticipated that in the course of the employee's duties they may make or discover intellectual property and in this respect they have a special obligation to further the interests of the Company.

Intellectual property includes patents, registered or unregistered trademarks and designs, utility models, copyrights, including design copyrights, applications for any of the foregoing and the right to apply for them in any part of the world, discoveries, creations, inventions or improvements upon or additions to an invention, confidential information, know-how and any research relating to the above, business names, whether registerable or not, moral rights and any similar rights in any country.

Subject to the provisions of the Patents Act 1977 and the Copyright, Designs and Patents Act 1988, if any time during the employee's employment they make or discover or participate in the making or discovery of any intellectual property relating to or capable of being used in the business carried on by the Company, the employee must communicate the details forthwith to the Company and such intellectual property will be the absolute property of the Company.

At the Company's request and expense, the employee must give and supply all such information, data, drawings and assistance as may be necessary to enable the Company to exploit the intellectual property to best advantage, and must execute all documents and do such things as may be necessary or desirable for obtaining patent and other protection for the intellectual property in such parts of the world as may be specified by the Company and for vesting the same in our Company or as they may direct.

The employee irrevocably appoints the Company in their name and on their behalf to sign and execute such instruments and do such things and generally to use their name for the purposes of giving to the Company (or their nominees) the full benefit of the provisions of this clause. A certificate in writing signed by the Company that an instrument or act falls within the authority conferred by this clause will be conclusive evidence that such is the case.

If while in the employment of the Company the employee makes, or discovers intellectual property which does not become the property of the Company then, subject to the provisions of the Patents Act 1977, the Company will have the right to acquire for themselves or their nominee the employee's right therein on fair and reasonable terms, to be agreed or settled by a single arbitrator appointed by the President of Chartered Institute of Arbitrators who shall adjudicate at our joint expense.

The rights and obligations arising under this clause will continue to have full force and effect after the employee's employment has terminated and will be binding upon their representatives.

CLAUSE 8 - SOCIAL MEDIA
The Company uses social networking sites to further the development of the Company's business on a global basis and the Company provides access for employees to these sites solely for the purpose of promoting the Company's services, products and business.

Any work, material or contact list created by the Employee in respect of such social networking sites obtained during the course of employment with the Company remains the property of the Company at all times.

Upon termination of employment the Employee covenants to hand over the access rights to all lists containing work, material and contact lists obtained via the social media outlets under the heading of the Company in order that these can be deleted.

This restriction will continue to apply following termination of employment without limit in point of time but shall cease to apply to information ordered to be disclosed by a Court of competent jurisdiction or otherwise required to be disclosed by law.

SEVERABILITY CLAUSE
Each of the restrictions contained in this Restrictive Covenant Agreement is intended to be separate and severable. In the event that any of the restrictions set out above shall be held to be void, then its/their deletion shall not affect the remainder of this Agreement, whose restrictions shall continue to apply with such deletion as may be necessary to make it valid and effective.

SIGNATURE: Employee                                          DATE:

SIGNATURE: On behalf of Schofield Fitness Ltd              DATE:

NAME: ${employee.name}                                      NAME:

Print                                                       Print`;
};

// Deductions from Pay Agreement Template
export const getDeductionsAgreementContent = (employee: EmployeeDetails) => {
  return `DEDUCTIONS FROM PAY AGREEMENT

Schofield Fitness Ltd

Employee Name: ${employee.name}
Date: ${new Date().toLocaleDateString('en-GB')}

If you are overpaid for any reason, the total amount of the overpayment will normally be deducted from your next payment but if this would cause hardship, arrangements may be made for the overpayment to be recovered over a longer period.

In the event that the Company is faced with a shortage of work, or is unable to provide you with work for any other reason, then you agree that the Company may temporarily:

a) place you on short-time working, in which case you will be paid for those hours worked; or

b) lay you off from work, in which case you will be paid in accordance with the statutory guarantee pay provisions in place at that time; or

c) designate you as a furloughed (or similar) worker, in accordance with the terms of any Government furlough (or similar) scheme in place from time to time, in which case during such period, if required, you will cease to carry out any work for the Company. (For this purpose you agree that the Company may adjust your salary and benefits by an appropriate amount to ensure that it receives reimbursement of such salary and benefits under the said scheme to the fullest extent possible).

The entirety of this section entitled "Shortage of work" forms part of your contractual terms and conditions.

Any damage to stock or property that is the result of your carelessness, negligence or deliberate vandalism will render you liable to pay the full or part of the cost of repair or replacement.

Any loss to us that is the result of your failure to observe rules, procedures or instruction, or is as a result of your negligent behaviour or your unsatisfactory standards of work will render you liable to reimburse to us the full or part of the cost of the loss. In the event of failure to pay, such costs will be deducted from your pay.

On the termination of your employment you must return all items of your uniform to us. Failure to return such items will result in the cost of the items being deducted from any monies outstanding to you.

If you arrive for work and, in our opinion, you are not fit to work, we reserve the right to exercise our duty of care if we believe that you may not be able to undertake your duties in a safe manner or may pose a safety risk to others, and send you away for the remainder of the day with or without pay and, dependent on the circumstances, you may be liable to disciplinary action.

The Company provides tools and/or equipment necessary to carry out your duties. You should keep these in good repair and take all reasonable steps to ensure that they are secure at all times. You must report any lost, damaged or mislaid tools and/or equipment to the Managing Director. You must return all Company tools and/or equipment upon termination of employment by either party. Failure to return tools and/or equipment, or any loss or damage suffered as a result of your negligence, will result in a deduction to cover the cost of the tools and/or equipment being made from monies due to you.

If you terminate your employment without giving or working the required period of notice, as indicated in your individual statement of main terms of employment, you will have an amount equal to any additional cost of covering your duties during the notice period not worked deducted from any termination pay due to you. You will also forfeit any contractual accrued holiday pay due to you over and above your statutory holiday pay, if you fail to give or work the required period of notice.

On the termination of your employment you must return all our property which is in your possession or for which you have responsibility. Failure to return such items will result in the cost of the items being deducted from any monies outstanding to you.

I have read and I understand the above terms. I agree that they form part of my Contract of Employment.

SIGNATURE: Employee                                          DATE:

NAME: ${employee.name}`;
};