/**
 * PlanBadge Component
 *
 * Displays the user's current subscription plan with visual styling
 */'use client'

import {UserSubscription, SubscriptionPlan} from'@/types'

interface PlanBadgeProps {plan: SubscriptionPlan
 addons?: UserSubscription['addons']
 status?: UserSubscription['status']
 size?:'sm' |'md' |'lg'}

export function PlanBadge({plan, addons, status, size ='md'}: PlanBadgeProps) {const getPlanColor = () => {switch (plan) {case'free':
 return'bg-gray-100 text-gray-700 border-gray-300'
 case'single':
 return'bg-blue-100 /30 text-blue-700 border-blue-300'
 case'family_basic':
 case'family_plus':
 case'family_premium':
 return'bg-purple-100 /30 text-purple-700 border-purple-300'
 default:
 return'bg-gray-100 text-gray-700 border-gray-300'}}

 const getSizeClasses = () => {switch (size) {case'sm':
 return'px-2 py-0.5 text-xs'
 case'md':
 return'px-3 py-1 text-sm'
 case'lg':
 return'px-4 py-2 text-base'
 default:
 return'px-3 py-1 text-sm'}}

 const getPlanIcon = () => {switch (plan) {case'free':
 return'🆓'
 case'single':
 return'👤'
 case'family_basic':
 case'family_plus':
 case'family_premium':
 return'👨‍👩‍👧‍👦'
 default:
 return''}}

 const getPlanLabel = () => {switch (plan) {case'free':
 return status ==='trialing' ?'Free Trial' :'Free'
 case'single':
 return'Single User'
 case'family_basic':
 return'Family Basic'
 case'family_plus':
 return'Family Plus'
 case'family_premium':
 return'Family Premium'
 default:
 return'Unknown'}}

 const hasFamilyFeatures = addons?.familyFeatures === true

 return (<div className="inline-flex items-center gap-2 flex-wrap">
 <span className={`inline-flex items-center gap-1.5 border rounded-full font-medium ${getPlanColor()} ${getSizeClasses()}`}>
 <span>{getPlanIcon()}</span>
 <span>{getPlanLabel()}</span>
 </span>

 {hasFamilyFeatures && (<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 /30 text-green-700 border border-green-300 rounded-full text-xs font-medium">
 <span>✨</span>
 <span>Family Features</span>
 </span>)}

 {status ==='trialing' && (<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 /30 text-yellow-700 border border-yellow-300 rounded-full text-xs font-medium">
 <span>⏰</span>
 <span>Trial</span>
 </span>)}
 </div>)}
