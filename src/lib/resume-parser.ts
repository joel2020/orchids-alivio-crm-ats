import { ParsedResume } from "./types"

export interface ResumeParserAdapter {
  name: string
  parseResume(fileBuffer: Buffer, fileType: string): Promise<{
    data: ParsedResume
    confidence: number
  }>
}

function extractNameParts(fullName: string | null): { firstName: string | null; lastName: string | null } {
  if (!fullName) return { firstName: null, lastName: null }
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: null }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") }
}

function extractEmail(text: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const matches = text.match(emailRegex)
  return matches?.[0] || null
}

function extractPhone(text: string): string[] {
  const phoneRegex = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g
  const matches = text.match(phoneRegex)
  return matches || []
}

function extractLinkedIn(text: string): string | null {
  const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?/gi
  const matches = text.match(linkedinRegex)
  return matches?.[0] || null
}

function extractGithub(text: string): string | null {
  const githubRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+\/?/gi
  const matches = text.match(githubRegex)
  return matches?.[0] || null
}

class BasicTextParser implements ResumeParserAdapter {
  name = "basic-text"

  async parseResume(fileBuffer: Buffer, fileType: string): Promise<{ data: ParsedResume; confidence: number }> {
    let text = ""

    if (fileType === "text/plain" || fileType === "txt") {
      text = fileBuffer.toString("utf-8")
    } else {
      text = fileBuffer.toString("utf-8")
    }

    const lines = text.split("\n").filter((l) => l.trim())
    const fullName = lines[0]?.trim() || null
    const { firstName, lastName } = extractNameParts(fullName)

    const primaryEmail = extractEmail(text)
    const phoneNumbers = extractPhone(text)
    const linkedinUrl = extractLinkedIn(text)
    const githubUrl = extractGithub(text)

    const locationKeywords = ["location:", "address:", "city:"]
    let location: string | null = null
    for (const line of lines) {
      const lowerLine = line.toLowerCase()
      for (const keyword of locationKeywords) {
        if (lowerLine.includes(keyword)) {
          location = line.split(":")[1]?.trim() || null
          break
        }
      }
    }

    let currentTitle: string | null = null
    let currentCompany: string | null = null
    const titleKeywords = ["title:", "position:", "role:"]
    const companyKeywords = ["company:", "employer:", "organization:"]

    for (const line of lines) {
      const lowerLine = line.toLowerCase()
      for (const keyword of titleKeywords) {
        if (lowerLine.includes(keyword)) {
          currentTitle = line.split(":")[1]?.trim() || null
        }
      }
      for (const keyword of companyKeywords) {
        if (lowerLine.includes(keyword)) {
          currentCompany = line.split(":")[1]?.trim() || null
        }
      }
    }

    const data: ParsedResume = {
      fullName,
      firstName,
      lastName,
      primaryEmail,
      secondaryEmails: [],
      phoneNumbers,
      currentLocation: location
        ? { city: location, state: null, country: null }
        : null,
      relocationOpen: false,
      remotePreference: "unknown",
      currentTitle,
      currentCompany,
      linkedinUrl,
      githubUrl,
      personalWebsiteUrl: null,
      summary: null,
      experience: [],
      education: [],
      skills: [],
    }

    const confidence = primaryEmail ? 0.5 : 0.3

    return { data, confidence }
  }
}

class MockParser implements ResumeParserAdapter {
  name = "mock"

  async parseResume(_fileBuffer: Buffer, _fileType: string): Promise<{ data: ParsedResume; confidence: number }> {
    const data: ParsedResume = {
      fullName: "John Doe",
      firstName: "John",
      lastName: "Doe",
      primaryEmail: "john.doe@example.com",
      secondaryEmails: [],
      phoneNumbers: ["+1-555-123-4567"],
      currentLocation: { city: "San Francisco", state: "CA", country: "USA" },
      relocationOpen: true,
      remotePreference: "hybrid",
      currentTitle: "Senior Software Engineer",
      currentCompany: "Tech Corp",
      linkedinUrl: "https://linkedin.com/in/johndoe",
      githubUrl: "https://github.com/johndoe",
      personalWebsiteUrl: null,
      summary: "Experienced software engineer with 8+ years in full-stack development",
      experience: [
        {
          companyName: "Tech Corp",
          title: "Senior Software Engineer",
          startDate: "2020-01",
          endDate: null,
          isCurrent: true,
          location: "San Francisco, CA",
          responsibilities: "Led development of microservices architecture",
          skills: ["TypeScript", "Node.js", "React"],
        },
      ],
      education: [
        {
          institutionName: "Stanford University",
          degree: "Bachelor of Science",
          fieldOfStudy: "Computer Science",
          startDate: "2012-09",
          endDate: "2016-06",
        },
      ],
      skills: [
        { name: "TypeScript", level: "Expert", yearsExperience: 5 },
        { name: "React", level: "Expert", yearsExperience: 6 },
        { name: "Node.js", level: "Advanced", yearsExperience: 7 },
      ],
    }

    return { data, confidence: 0.95 }
  }
}

const parsers: Record<string, ResumeParserAdapter> = {
  "basic-text": new BasicTextParser(),
  mock: new MockParser(),
}

export function getParser(provider?: string): ResumeParserAdapter {
  const selectedProvider = provider || process.env.RESUME_PARSER_PROVIDER || "basic-text"
  return parsers[selectedProvider] || parsers["basic-text"]
}

export async function parseResume(
  fileBuffer: Buffer,
  fileType: string,
  provider?: string
): Promise<{ data: ParsedResume; confidence: number; provider: string }> {
  const parser = getParser(provider)
  const result = await parser.parseResume(fileBuffer, fileType)
  return { ...result, provider: parser.name }
}
