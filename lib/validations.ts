import { z } from 'zod';

export const employeeFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  jobTitle: z.string().min(2, 'Job title must be at least 2 characters'),
  annualSalary: z.number().positive('Salary must be a positive number'),
  hoursPerWeek: z.number().min(1).max(48, 'Hours must be between 1 and 48'),
  location: z.enum(['York', 'Harrogate'], {
    errorMap: () => ({ message: 'Please select a location' }),
  }),
  startDate: z.string().refine((date) => {
    const d = new Date(date);
    return d instanceof Date && !isNaN(d.getTime());
  }, 'Invalid date'),
});

export type EmployeeFormData = z.infer<typeof employeeFormSchema>;

export const onboardingSubmissionSchema = z.object({
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms of employment',
  }),
  acceptRestrictive: z.boolean().refine((val) => val === true, {
    message: 'You must accept the restrictive covenant agreement',
  }),
  acceptDeductions: z.boolean().refine((val) => val === true, {
    message: 'You must accept the deductions from pay agreement',
  }),
  signatureName: z.string().min(2, 'Please enter your full name'),
  signatureDate: z.string(),
});

export type OnboardingSubmissionData = z.infer<typeof onboardingSubmissionSchema>;