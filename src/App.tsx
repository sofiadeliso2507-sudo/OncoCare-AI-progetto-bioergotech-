import { useCallback, useEffect, useState } from 'react';
import { AuthRoleGate } from './components/AuthRoleGate';
import { PatientPortalView } from './components/PatientPortalView';
import { DoctorPortalView } from './components/DoctorPortalView';
import type { DoctorProfile, UserRole } from './types/onco';

interface PatientDirectoryItem {
  codice: string;
  nome: string;
  cognome: string;
  avatar: string;
}

export default function App() {
  const [session, setSession] = useState<{
    role: UserRole;
    patientCode?: string;
    doctorId?: string;
  } | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart');
    if (autostart === '1' || autostart === 'patient') {
      return { role: 'patient', patientCode: 'PZ001' };
    }
    if (autostart === 'doctor') {
      return { role: 'doctor', doctorId: 'DOC01' };
    }
    return null;
  });

  const [patients, setPatients] = useState<PatientDirectoryItem[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [bootLoading, setBootLoading] = useState(true);

  const loadDirectory = useCallback(async () => {
    try {
      const [pRes, dRes] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/doctors'),
      ]);
      if (pRes.ok) {
        const pData = await pRes.json();
        setPatients(pData.patients ?? []);
      }
      if (dRes.ok) {
        const dData = await dRes.json();
        setDoctors(dData.doctors ?? []);
      }
    } finally {
      setBootLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDirectory();
  }, [loadDirectory]);

  if (bootLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-600">
        Avvio OncoCare AI...
      </div>
    );
  }

  if (!session) {
    return (
      <AuthRoleGate
        patients={patients}
        doctors={doctors}
        onAuthenticated={(sel) => setSession(sel)}
      />
    );
  }

  if (session.role === 'patient') {
    return (
      <PatientPortalView
        initialPatientCode={session.patientCode ?? 'PZ001'}
        allPatientCodes={patients}
        onSwitchRole={() => setSession(null)}
        onPatientDirectoryRefresh={loadDirectory}
      />
    );
  }

  return (
    <DoctorPortalView
      doctorId={session.doctorId ?? 'DOC01'}
      allDoctors={doctors}
      onSwitchRole={() => setSession(null)}
    />
  );
}
