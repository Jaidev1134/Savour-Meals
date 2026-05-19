# TEST PLAN: Savour Meals Platform
**MERN Stack • Food Redistribution System**

---

## Table of Contents
1. [INTRODUCTION](#1-introduction)
   - [1.1 OBJECTIVES](#11-objectives)
   - [1.2 TEAM MEMBERS](#12-team-members)
2. [SCOPE](#2-scope)
3. [ASSUMPTIONS / RISKS](#3-assumptions--risks)
   - [3.1 ASSUMPTIONS](#31-assumptions)
   - [3.2 RISKS](#32-risks)
4. [TEST APPROACH](#4-test-approach)
   - [4.1 TEST AUTOMATION](#41-test-automation)
5. [TEST ENVIRONMENT](#5-test-environment)
6. [MILESTONES / DELIVERABLES](#6-milestones--deliverables)
   - [6.1 TEST SCHEDULE](#61-test-schedule)
   - [6.2 DELIVERABLES](#62-deliverables)

---

## 1. Introduction
The Test Plan for the **Savour Meals Platform** has been developed to formalize the quality assurance strategy for the food redistribution ecosystem. This document outlines the testing objectives, scope, methodology, and resource requirements. By establishing a rigorous testing framework, the project ensures that the platform reliably facilitates the distribution of surplus food between donors and NGOs, while maintaining data integrity and security across the MERN stack.

### 1.1 Objectives
The primary objective of the Savour Meals testing phase is to validate the end-to-end workflow of food donation and distribution. The platform is a full-stack solution utilizing **MongoDB**, **Express.js**, **React**, and **Node.js**. 

The testing phase aims to:
- Verify robust Authentication and Authorization mechanisms (Role-Based Access Control).
- Ensure the accuracy of the Food Donation module, specifically time-sensitive logic (expiry validation).
- Validate the Delivery & Volunteer module to prevent missed collections or data inconsistencies.
- Confirm real-time notification reliability and database integrity.

The ultimate goal is to deliver a zero-defect environment where food security and user privacy are prioritized.

### 1.2 Team Members
| Resource Name | Role | Reg Number |
| :--- | :--- | :--- |
| **BANDARU RAM JAYADEEP** | Lead QA Engineer / Integration Testing | BL.EN.U4CSE23211 |
| **JAIDEV SHARMA** | Backend Testing / Security Auditor | BL.EN.U4CSE23223 |
| **PADALA SIVA RAMA KRISHNA REDDY** | Frontend UI/UX Testing | BL.EN.U4CSE23241 |
| **PATHEM ASHWAK PATEL** | Documentation & Performance Testing | BL.EN.U4CSE23244 |

---

## 2. Scope
The scope of this Test Plan covers all "Must-Have" requirements for the initial launch of the Savour Meals Platform. The focus is on functional verification across the four primary user roles: Donor, NGO, Volunteer, and Admin.

**In-Scope:**
1. **User Management**: Registration, Login, and JWT-based session management.
2. **Donation Lifecycle**: Creation of food pledges, image uploads, and geolocation tagging.
3. **Logistics Tracking**: Acceptance of donations by NGOs and status updates by Volunteers (Pending → Accepted → Picked → Delivered).
4. **Logic Validation**: Ensuring preparation times and expiry dates are chronologically logical.
5. **Data Security**: Restricting API endpoints based on user roles (e.g., preventing a Donor from accessing NGO dashboards).

**Out-of-Scope:**
- **External Payment Gateways**: Not applicable for this redistribution model.
- **Legacy Data Migration**: The project starts with a clean database.
- **Hardware Compatibility Testing**: Testing is limited to modern web browsers.

---

## 3. Assumptions / Risks
### 3.1 Assumptions
1. **Database Availability**: The MongoDB Atlas cluster is reachable and configured with correct IP whitelisting.
2. **Environment Consistency**: Development, QA, and Production environments will share identical Node.js (v18+) versions.
3. **Connectivity**: Testing assumes a stable internet connection for API interactions and Firebase notification triggers.

### 3.2 Risks
| # | Risk | Impact | Trigger | Mitigation Plan |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Scope Creep** | High | Testers wanting more features during testing | Closely monitor functionality and set strict priorities with stakeholders. |
| 2 | **Data Corruption** | High | Concurrent updates to donation status | Implement Mongoose transactions for atomicity. |
| 3 | **Security Breach** | Critical | JWT secret leak or weak hashing | Use environment variables for secrets; enforce Bcrypt for passwords. |
| 4 | **Notification Failure** | Medium | Firebase service downtime | Implement a fall-back dashboard alert system within the React frontend. |

---

## 4. Test Approach
The project employs an **Agile Test-Driven approach**, with weekly iterations. At the end of each iteration, functional deliverables are tested against the defined requirements.

**Testing Levels:**
1. **Unit Testing**: Focuses on individual controllers (e.g., `authController`, `foodController`).
2. **Integration Testing**: Validates the interaction between the Node.js API and the MongoDB database.
3. **User Acceptance Testing (UAT)**: Simulating real-world scenarios for each user role to ensure the UI/UX meets project specifications.

### 4.1 Test Automation
- **Unit & API Testing**: Automated scripts using Jest/Supertest are utilized to verify API endpoints.
- **Development Tests**: Automated unit tests are part of the core development process.
- **Manual Testing**: Used for UI/UX visual audits and exploratory testing as team members learn the tool.

---

## 5. Test Environment
A dedicated environment is required for testing:
- **Web Server/Application**: Node.js v18.x.
- **Database**: MongoDB Atlas Cluster.
- **API Client**: Postman / Automated scripts.
- **Browsers**: Latest versions of Chrome, Firefox, and Safari.

---

## 6. Milestones / Deliverables
### 6.1 Test Schedule
| Task Name | Start | Finish | Effort | Comments |
| :--- | :--- | :--- | :--- | :--- |
| **Review Requirements Docs** | Day 1 | Day 2 | 2 Days | Analysis of Savour Meals functional specs. |
| **Create Test Estimates** | Day 3 | Day 3 | 1 Day | Defining resource needs and timelines. |
| **Staff & Train Resources** | Day 4 | Day 5 | 2 Days | Training team on MERN testing tools. |
| **Deploy to QA Env** | Day 6 | Day 6 | 1 Day | Initial deployment for testing. |
| **Functional Testing (Iter 1)** | Day 7 | Day 11 | 5 Days | Testing Auth and Donation modules. |
| **Regression Testing** | Day 12 | Day 14 | 3 Days | Ensuring new changes don't break existing features. |
| **UAT & Resolution** | Day 15 | Day 18 | 4 Days | Final user flow verification and bug fixing. |
| **Release to Production** | Day 19 | Day 19 | 1 Day | Deployment to live environment. |

### 6.2 Deliverables
| Deliverable | Stakeholder | Date / Milestone |
| :--- | :--- | :--- |
| **Test Plan** | Project Manager; QA Director | Project Inception |
| **Traceability Matrix** | Project Manager; QA Director | Final Handover |
| **Test Results** | Project Manager | Completion of Testing |
| **Test Status Report** | QA Manager, QA Director | Weekly |
| **Metrics Report** | All Team Members | Project Closure |

---
*End of Test Plan*
