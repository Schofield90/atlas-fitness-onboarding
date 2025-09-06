"use client";

import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

interface AdAccount {
  id: string;
  account_name: string;
  facebook_ad_account_id: string;
  currency: string;
  is_active: boolean;
  spend_cap?: number;
  last_insights_sync_at?: string;
}

interface AdAccountSelectorProps {
  accounts: AdAccount[];
  selectedAccount: string;
  onAccountChange: (accountId: string) => void;
}

export function AdAccountSelector({
  accounts,
  selectedAccount,
  onAccountChange,
}: AdAccountSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedAccountData = accounts.find(
    (account) => account.id === selectedAccount,
  );

  if (accounts.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="text-center">
          <p className="text-gray-400 text-sm">No ad accounts connected</p>
          <button className="text-blue-400 hover:text-blue-300 text-sm mt-2">
            Connect Ad Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-64 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="flex items-center space-x-3">
          <div
            className={`w-3 h-3 rounded-full ${
              selectedAccountData?.is_active ? "bg-green-400" : "bg-red-400"
            }`}
          />
          <div className="text-left">
            <div className="text-sm font-medium">
              {selectedAccountData?.account_name || "Select Account"}
            </div>
            <div className="text-xs text-gray-400">
              {selectedAccountData?.currency || ""}
            </div>
          </div>
        </div>
        <ChevronDownIcon
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => {
                  onAccountChange(account.id);
                  setIsOpen(false);
                }}
                className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-gray-700 focus:outline-none focus:bg-gray-700"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      account.is_active ? "bg-green-400" : "bg-red-400"
                    }`}
                  />
                  <div>
                    <div className="text-sm font-medium text-white">
                      {account.account_name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {account.facebook_ad_account_id} • {account.currency}
                    </div>
                    {account.spend_cap && (
                      <div className="text-xs text-gray-500">
                        Spend Cap: ${(account.spend_cap / 100).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
                {selectedAccount === account.id && (
                  <CheckIcon className="w-4 h-4 text-blue-400" />
                )}
              </button>
            ))}

            {/* Add Account Option */}
            <div className="border-t border-gray-700">
              <button className="w-full px-4 py-3 text-left text-blue-400 hover:bg-gray-700 hover:text-blue-300 text-sm">
                + Connect Another Ad Account
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
