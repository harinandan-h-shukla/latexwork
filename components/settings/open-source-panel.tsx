import { ScaleIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitHubIcon } from "@/components/shell/oauth-icons";

const REPO_URL = "https://github.com/harinandan-h-shukla/latexwork";

/** AGPL-3.0 §13: anyone interacting with this program over a network must
 * be offered a way to get its source — this panel (and the marketing
 * site's footer) is that, not just a nice-to-have. */
export function OpenSourcePanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScaleIcon className="size-4 text-sky-500" />
          Open source
        </CardTitle>
        <CardDescription>
          Inkwell is free and open source under the GNU Affero General Public License v3.0
          (AGPL-3.0). You&apos;re entitled to the complete source code of the exact version running
          here.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          nativeButton={false}
          render={<a href={REPO_URL} target="_blank" rel="noreferrer" />}
        >
          <GitHubIcon className="size-3.5" />
          View source on GitHub
        </Button>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<a href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer" />}
        >
          Read the license
        </Button>
      </CardContent>
    </Card>
  );
}
