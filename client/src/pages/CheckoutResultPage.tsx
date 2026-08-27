import React from "react";
import { CheckCircle2, ArrowLeft, BookOpen, XCircle } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import "./CheckoutResultPage.css";

export default function CheckoutResultPage() {
  const [, params] = useRoute("/checkout/:status");
  const [, setLocation] = useLocation();
  const succeeded = params?.status === "success";
  return <main className={`checkout-result checkout-result--${succeeded ? "success" : "cancel"}`}><div className="checkout-result__mark"><BookOpen size={23} /></div>{succeeded ? <CheckCircle2 size={34} /> : <XCircle size={34} />}<p>{succeeded ? "Payment received" : "Checkout paused"}</p><h1>{succeeded ? <>Thank you for<br /><em>your next chapter.</em></> : <>Your bag is still<br /><em>waiting for you.</em></>}</h1><span>{succeeded ? "Your payment is complete. We will prepare your selected titles with care." : "No payment was taken. You can return to your bag whenever you are ready."}</span><div><button className="button button--dark" onClick={() => setLocation(succeeded ? "/" : "/cart")}>{succeeded ? "Return to the library" : "Return to bag"}</button><button className="text-link" onClick={() => setLocation("/")}><ArrowLeft size={16} /> Continue browsing</button></div></main>;
}
