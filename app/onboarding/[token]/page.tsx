'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { onboardingSubmissionSchema, OnboardingSubmissionData } from '@/lib/validations';
import {
  getStatementOfTermsContent,
  getRestrictiveCovenantContent,
  getDeductionsAgreementContent,
  EmployeeDetails,
} from '@/lib/documents/templates';

export default function OnboardingPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<EmployeeDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<number>(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingSubmissionData>({
    resolver: zodResolver(onboardingSubmissionSchema),
    defaultValues: {
      signatureDate: new Date().toISOString().split('T')[0],
    },
  });

  const fetchOnboardingData = useCallback(async () => {
    try {
      const response = await fetch(`/api/onboarding/${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load onboarding data');
      }

      setEmployee(data.employee);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOnboardingData();
  }, [fetchOnboardingData]);

  const onSubmit = async (data: OnboardingSubmissionData) => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/onboarding/${token}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete onboarding');
      }

      // Redirect to success page
      router.push(`/onboarding/${token}/success`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading onboarding information...</p>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Onboarding Error
          </h1>
          <p className="text-red-600 mb-4">{error || 'Invalid onboarding link'}</p>
          <p className="text-gray-600">
            Please contact HR if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  const documents = [
    {
      title: 'Statement of Main Terms of Employment',
      content: getStatementOfTermsContent(employee),
    },
    {
      title: 'Restrictive Covenant Agreement',
      content: getRestrictiveCovenantContent(employee),
    },
    {
      title: 'Deductions from Pay Agreement',
      content: getDeductionsAgreementContent(employee),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome to Atlas Fitness, {employee.name}!
            </h1>
            <p className="mt-2 text-gray-600">
              Please review and sign your employment documents below.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row">
            {/* Document Navigation */}
            <div className="lg:w-1/4 border-r border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-4">Documents</h2>
              <nav className="space-y-2">
                {documents.map((doc, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedDocument(index)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedDocument === index
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {index + 1}. {doc.title}
                  </button>
                ))}
              </nav>
            </div>

            {/* Document Content */}
            <div className="lg:w-3/4 p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {documents[selectedDocument].title}
                </h2>
                <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700">
                    {documents[selectedDocument].content}
                  </pre>
                </div>
              </div>

              {/* Employee Details Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Personal Details Section */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Personal Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        {...register('firstName')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.firstName && (
                        <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        {...register('lastName')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.lastName && (
                        <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        {...register('phone')}
                        type="tel"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.phone && (
                        <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth
                      </label>
                      <input
                        {...register('dateOfBirth')}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.dateOfBirth && (
                        <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="nationalInsuranceNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        National Insurance Number
                      </label>
                      <input
                        {...register('nationalInsuranceNumber')}
                        type="text"
                        placeholder="AB123456C"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.nationalInsuranceNumber && (
                        <p className="mt-1 text-sm text-red-600">{errors.nationalInsuranceNumber.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1">
                        Postcode
                      </label>
                      <input
                        {...register('postcode')}
                        type="text"
                        placeholder="YO30 4XD"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.postcode && (
                        <p className="mt-1 text-sm text-red-600">{errors.postcode.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Address
                    </label>
                    <textarea
                      {...register('address')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="123 Main Street, City, County"
                    />
                    {errors.address && (
                      <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                    )}
                  </div>
                </div>

                {/* Bank Details Section */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Bank Details for Payment
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Name
                      </label>
                      <input
                        {...register('bankName')}
                        type="text"
                        placeholder="Barclays"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.bankName && (
                        <p className="mt-1 text-sm text-red-600">{errors.bankName.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="accountHolderName" className="block text-sm font-medium text-gray-700 mb-1">
                        Account Holder Name
                      </label>
                      <input
                        {...register('accountHolderName')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.accountHolderName && (
                        <p className="mt-1 text-sm text-red-600">{errors.accountHolderName.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        Account Number
                      </label>
                      <input
                        {...register('accountNumber')}
                        type="text"
                        placeholder="12345678"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.accountNumber && (
                        <p className="mt-1 text-sm text-red-600">{errors.accountNumber.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="sortCode" className="block text-sm font-medium text-gray-700 mb-1">
                        Sort Code
                      </label>
                      <input
                        {...register('sortCode')}
                        type="text"
                        placeholder="12-34-56"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.sortCode && (
                        <p className="mt-1 text-sm text-red-600">{errors.sortCode.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Document Acceptance and Signature */}
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Document Review & Signature
                  </h3>

                  <div className="space-y-3">
                    <label className="flex items-start">
                      <input
                        {...register('acceptTerms')}
                        type="checkbox"
                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        I have read and accept the Statement of Main Terms of Employment
                      </span>
                    </label>
                    {errors.acceptTerms && (
                      <p className="text-sm text-red-600 ml-6">
                        {errors.acceptTerms.message}
                      </p>
                    )}

                    <label className="flex items-start">
                      <input
                        {...register('acceptRestrictive')}
                        type="checkbox"
                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        I have read and accept the Restrictive Covenant Agreement
                      </span>
                    </label>
                    {errors.acceptRestrictive && (
                      <p className="text-sm text-red-600 ml-6">
                        {errors.acceptRestrictive.message}
                      </p>
                    )}

                    <label className="flex items-start">
                      <input
                        {...register('acceptDeductions')}
                        type="checkbox"
                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        I have read and accept the Deductions from Pay Agreement
                      </span>
                    </label>
                    {errors.acceptDeductions && (
                      <p className="text-sm text-red-600 ml-6">
                        {errors.acceptDeductions.message}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="signatureName"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Type your full name as signature
                      </label>
                      <input
                        {...register('signatureName')}
                        type="text"
                        placeholder="Your full name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.signatureName && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.signatureName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="signatureDate"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Date
                      </label>
                      <input
                        {...register('signatureDate')}
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? 'Submitting...'
                    : 'Submit and Complete Onboarding'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}