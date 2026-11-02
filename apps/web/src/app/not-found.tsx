import { buttonVariants } from "@vogwork/ui";
import Link from "next/link";
import { T } from "@/components/t";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-primary/30">404</p>
      <h1 className="mt-4 text-2xl font-bold">
        <T k="notFoundTitle" />
      </h1>
      <p className="mt-2 text-muted-foreground">
        <T k="notFoundBody" />
      </p>
      <Link href="/" className={buttonVariants({ className: "mt-6" })}>
        <T k="backHome" />
      </Link>
    </div>
  );
}
