const axios = require('axios');

const baseURL = 'http://localhost:3096';
const api = axios.create({ baseURL });

// We'll create one user for each role.
const ROLES = [
  'Student', 'FacultyAdvisor', 'HOD', 'JuniorSuperintendent', 'AO', 
  'VicePrincipal', 'Principal', 'CFO', 'Manager', 'AccountsSection', 
  'Driver', 'TransportinCharge', 'HRSection', 'MaintenanceSection', 'Faculty', 'Staff'
];

async function runTests() {
  console.log('Starting E2E Workflow Tests...');
  
  // 1. Authenticate / Create test users
  const tokens = {};
  for (const role of ROLES) {
    const email = `test_${role.toLowerCase()}@sngce.ac.in`;
    try {
      const res = await api.post('/login', { email, password: 'password123' });
      tokens[role] = res.data.token;
    } catch (err) {
      if (err.response && (err.response.status === 400 || err.response.status === 404)) {
        // Create the user
        await api.post('/register', {
          name: `Test ${role}`,
          email,
          password: 'password123',
          role: role,
          department: 'CSE'
        });
        const res = await api.post('/login', { email, password: 'password123' });
        tokens[role] = res.data.token;
      } else {
        console.error(`Login failed for ${role}:`, err.response ? err.response.data : err.message);
      }
    }
  }

  console.log('All test users authenticated.');

  const hierarchies = {
    '1': ['FacultyAdvisor', 'HOD', 'Principal', 'JuniorSuperintendent', 'CFO', 'Manager'],
    '2': ['FacultyAdvisor', 'HOD', 'Principal', 'Manager'],
    '3': ['AO', 'Principal', 'CFO', 'Manager'],
    '4': ['CFO', 'Manager'], 
    '4a': ['TransportinCharge', 'JuniorSuperintendent', 'AO', 'Manager'], 
    '6': ['AO', 'Principal', 'Manager'],
    '7': ['FacultyAdvisor', 'HOD', 'VicePrincipal', 'Principal', 'CollegeCouncil'],
    '8a': ['FacultyAdvisor', 'HOD', 'JuniorSuperintendent', 'AO', 'Principal', 'CFO', 'Manager'],
    '8b': ['FacultyAdvisor', 'HOD', 'JuniorSuperintendent', 'MaintenanceSection'],
    '9': ['FacultyAdvisor', 'HOD', 'Principal', 'AO']
  };

  const originators = {
    '1': 'Faculty',
    '2': 'Faculty',
    '3': 'JuniorSuperintendent',
    '4': 'AccountsSection',
    '4a': 'Driver',
    '6': 'HRSection',
    '7': 'FacultyAdvisor',
    '8a': 'Faculty',
    '8b': 'Faculty',
    '9': 'Faculty'
  };

  let allPassed = true;

  for (const [typeKey, chain] of Object.entries(hierarchies)) {
    console.log(`\n==============================================`);
    console.log(`Testing Workflow Type ${typeKey}`);
    const originator = originators[typeKey];
    
    if (!tokens[originator]) {
      console.log(`Skipping Type ${typeKey}: Originator ${originator} not available`);
      continue;
    }

    try {
      // 1. Submit form
      const submitRes = await api.post('/facultyFormSubmission', {
        category: `Type:${typeKey}.Test`,
        subject: `E2E Test Form Type ${typeKey}`,
        department: 'CSE',
        details: 'Testing form submission',
        to: [chain[0]], // Start of chain
        formType: 'faculty', // standard for staff apps, students would use 'student'
        year: '3', div: 'A',
        date: new Date().toISOString(),
        submittedBy: `test_${originator.toLowerCase()}@sngce.ac.in`
      }, {
        headers: { Authorization: `Bearer ${tokens[originator]}` }
      });
      
      const getForms = await api.get(`/getFFormsByUser?email=test_${originator.toLowerCase()}@sngce.ac.in`, {
        headers: { Authorization: `Bearer ${tokens[originator]}` }
      });
      const latestForm = getForms.data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      const formId = latestForm._id || latestForm.id;
      console.log(`[PASS] Submitted form ID ${formId} by ${originator}`);

      // 2. Walk through approval chain
      let currentChain = [...chain];
      let formStatus = 'awaiting';

      for (let i = 0; i < currentChain.length; i++) {
        const role = currentChain[i];
        if (role === 'CollegeCouncil') continue; // Not a real user
        
        console.log(`Testing approval by ${role}...`);
        
        // Next receiver logic
        const nextRole = (i + 1 < currentChain.length && currentChain[i+1] !== 'CollegeCouncil') ? currentChain[i+1] : null;
        
        const actRes = await api.put('/updateFormRemarksStatus', {
          formId,
          formType: 'faculty',
          status: nextRole ? 'awaiting' : 'accepted',
          remarks: `Approved by ${role}`,
          to: nextRole ? [...currentChain.slice(0, i+1), nextRole] : undefined, // the frontend actually appends next role
        }, {
          headers: { Authorization: `Bearer ${tokens[role]}` }
        });
        
        console.log(`[PASS] Approved by ${role}. Form went to ${nextRole || 'accepted'}`);
      }
      
      // Check final status
      const getRes = await api.get(`/getArchivedForms?email=test_${originator.toLowerCase()}@sngce.ac.in&role=${originator}`, {
        headers: { Authorization: `Bearer ${tokens[originator]}` }
      });
      
      const found = getRes.data.find(f => (f._id || f.id) === formId);
      if (found && found.status === 'accepted') {
        console.log(`[PASS] Workflow Type ${typeKey} completed successfully!`);
      } else {
        console.log(`[FAIL] Workflow Type ${typeKey} failed to reach accepted state.`);
        allPassed = false;
      }
      
    } catch (err) {
      console.error(`[FAIL] Workflow Type ${typeKey} encountered error:`, err.response ? err.response.data : err.message);
      allPassed = false;
    }
  }

  // Edit flow testing
  console.log(`\n==============================================`);
  console.log(`Testing Edit Flow...`);
  try {
    const editFormRes = await api.post('/facultyFormSubmission', {
      category: `Type:8b.Test`,
      subject: `E2E Test Edit Flow`,
      department: 'CSE',
      details: 'Will be edited',
      to: ['FacultyAdvisor'],
      formType: 'faculty',
      date: new Date().toISOString(),
      submittedBy: 'test_faculty@sngce.ac.in'
    }, {
      headers: { Authorization: `Bearer ${tokens['Faculty']}` }
    });
    
    const getEditForms = await api.get(`/getFFormsByUser?email=test_faculty@sngce.ac.in`, {
      headers: { Authorization: `Bearer ${tokens['Faculty']}` }
    });
    const latestEditForm = getEditForms.data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    const editFormId = latestEditForm._id || latestEditForm.id;
    console.log(`[PASS] Submitted edit form ID ${editFormId} by Faculty`);

    // Faculty Advisor requests edit
    await api.put('/updateFormRemarksStatus', {
      formId: editFormId,
      formType: 'faculty',
      status: 'edit',
      remarks: 'Please update details'
    }, {
      headers: { Authorization: `Bearer ${tokens['FacultyAdvisor']}` }
    });
    console.log(`[PASS] FacultyAdvisor requested edit.`);

    // Faculty resubmits without changing 'to' field
    await api.put('/updateFormRemarksStatus', {
      formId: editFormId,
      formType: 'faculty',
      status: 'awaiting',
      remarks: 'Updated details',
      details: 'New Details!'
    }, {
      headers: { Authorization: `Bearer ${tokens['Faculty']}` }
    });
    console.log(`[PASS] Faculty resubmitted form.`);

    // Check who has the form now
    const getFormsRes = await api.get(`/getReceivedFormsForUser?email=test_facultyadvisor@sngce.ac.in&role=FacultyAdvisor&department=CSE`, {
      headers: { Authorization: `Bearer ${tokens['FacultyAdvisor']}` }
    });
    
    const foundForm = getFormsRes.data.find(f => (f._id || f.id) === editFormId);
    if (foundForm && foundForm.status === 'awaiting') {
      console.log(`[PASS] Edit flow successful! Form returned to FacultyAdvisor.`);
    } else {
      console.log(`[FAIL] Edit flow failed. Form not pending for FacultyAdvisor.`);
      allPassed = false;
    }

  } catch (err) {
    console.error(`[FAIL] Edit flow error:`, err.response ? err.response.data : err.message);
    allPassed = false;
  }

  if (allPassed) {
    console.log(`\n✅ ALL AUTOMATED API TESTS PASSED!`);
  } else {
    console.log(`\n❌ SOME TESTS FAILED. CHECK LOGS ABOVE.`);
  }

}

runTests();
