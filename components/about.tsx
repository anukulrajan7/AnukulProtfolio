'use client';

import React from 'react';
import SectionHeading from './section-heading';
import { motion } from 'framer-motion';
import { useSectionInView } from '@/lib/hooks';

export default function About() {
	const { ref } = useSectionInView('About');

	return (
		<motion.section
			ref={ref}
			className="mb-28 max-w-[45rem] text-center leading-8 sm:mb-40 scroll-mt-28"
			initial={{ opacity: 0, y: 100 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.175 }}
			id="about"
		>
			<SectionHeading>About me</SectionHeading>
			<p className="mb-3">
				After gaining experience in{' '}
				<span className="font-medium">web development</span>, I decided to focus
				on enhancing my skills in React.js and the MERN stack. I have done
				internships in React.js development and have completed freelance
				projects. My skillset includes{' '}
				<span className="font-medium">
					HTML, CSS, JavaScript, React.js, Tailwind CSS, Material UI, Node.js,
					Express.js
				</span>
				.<span className="italic">My favorite part of programming</span> is the
				problem-solving aspect. I <span className="underline">love</span> the
				feeling of finally figuring out a solution to a problem. My core stack
				is{' '}
				<span className="font-medium">
					React, Node.js, Express.js, and MongoDB
				</span>
				. I am also familiar with
				<span className="font-medium">Django, Next.js, and TypeScript</span>. I
				am always looking to learn new technologies. I am currently looking for
				a<span className="font-medium">full-time position</span> as a software
				developer.
			</p>

			<p>
				<span className="italic">When I'm not coding</span>, I enjoy playing
				video games, watching movies, and exploring new hobbies. I also enjoy{' '}
				<span className="font-medium">learning new things</span>. I am currently
				learning about
				<span className="font-medium">
					advanced web development and software engineering practices
				</span>
				. I'm also exploring
				<span className="font-medium">
					the latest advancements in frontend technologies
				</span>
				.
			</p>
		</motion.section>
	);
}
